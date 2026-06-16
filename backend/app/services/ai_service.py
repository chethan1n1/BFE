import os
import hashlib
import json
import time
from typing import Dict, Any, Optional, Tuple, List
from groq import AsyncGroq
from app.config import settings

# In-Memory Cache structure
# Maps SHA256 key -> (timestamp_created, response_json)
_cache: Dict[str, Tuple[float, Any]] = {}
CACHE_TTL = 3600  # 1 hour

# Initialize Groq client only if key is configured
client = None
if settings.GROQ_API_KEY:
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

def is_ai_enabled() -> bool:
    return client is not None

def _get_cache_key(payload: Any) -> str:
    payload_str = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(payload_str.encode('utf-8')).hexdigest()

def _read_cache(key: str) -> Optional[Any]:
    if key in _cache:
        timestamp, data = _cache[key]
        if time.time() - timestamp < CACHE_TTL:
            return data
        else:
            # Remove expired cache entry
            _cache.pop(key, None)
    return None

def _write_cache(key: str, data: Any):
    _cache[key] = (time.time(), data)

async def generate_entity_insights_api(entity_type: str, entity_name: str, stats: Dict[str, Any]) -> Dict[str, Any]:
    if not is_ai_enabled():
        return {
            "summary": "AI insights are not available. Groq API key is unconfigured.",
            "strengths": [],
            "coverage_areas": [],
            "key_relationships": []
        }
        
    payload = {
        "action": "entity_insights",
        "entity_type": entity_type,
        "entity_name": entity_name,
        "stats": stats
    }
    
    cache_key = _get_cache_key(payload)
    cached = _read_cache(cache_key)
    if cached:
        print("AI Service: Returning cached entity insights.")
        return cached

    # Prompt Setup
    system_prompt = (
        "You are an expert business strategy AI analyst. You are analyzing an entity within our consulting project database. "
        "You will be given the entity name, type, and statistics. You must return a structured JSON object. "
        "Do not include any explanation, intro, or markdown fences. The JSON structure must match exactly: "
        '{"summary": "...", "strengths": ["...", "..."], "coverage_areas": ["...", "..."], "key_relationships": ["...", "..."]}'
    )
    
    user_prompt = f"Entity Name: {entity_name}\nEntity Type: {entity_type}\nStatistics: {json.dumps(stats)}"
    
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        raw_response = chat_completion.choices[0].message.content
        parsed = json.loads(raw_response)
        _write_cache(cache_key, parsed)
        return parsed
    except Exception as e:
        print(f"AI Service Error generating entity insights: {e}")
        return {
            "summary": f"Failed to generate AI insights due to an api error: {str(e)}",
            "strengths": [],
            "coverage_areas": [],
            "key_relationships": []
        }

async def generate_credential_explanation_api(category: str, market: str, kpi: str, project_details: Dict[str, Any]) -> Dict[str, Any]:
    if not is_ai_enabled():
        return {
            "explanation": "AI explanations are not available. Groq API key is unconfigured."
        }
        
    payload = {
        "action": "credential_explanation",
        "category": category,
        "market": market,
        "kpi": kpi,
        "project_details": project_details
    }
    
    cache_key = _get_cache_key(payload)
    cached = _read_cache(cache_key)
    if cached:
        print("AI Service: Returning cached credential explanation.")
        return cached

    system_prompt = (
        "You are an expert proposal builder. You are writing a short, human-readable narrative explanation (1-2 sentences) "
        "of why a specific project credential from our database is recommended for a pitch targeting a given Category, Market, and KPI. "
        "Keep it concise, professional, and convincing. Return a JSON object matching exactly: "
        '{"explanation": "..."}'
    )
    
    user_prompt = (
        f"Target Criteria:\n- Category: {category}\n- Market: {market}\n- KPI: {kpi}\n\n"
        f"Project Credential Details:\n{json.dumps(project_details)}"
    )
    
    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"},
            temperature=0.2
        )
        
        raw_response = chat_completion.choices[0].message.content
        parsed = json.loads(raw_response)
        _write_cache(cache_key, parsed)
        return parsed
    except Exception as e:
        print(f"AI Service Error generating credential explanation: {e}")
        return {
            "explanation": "Could not generate AI reasoning because the Groq API call failed."
        }

async def generate_copilot_response_api(messages: List[Dict[str, str]], db: Any, mode: str = "analysis") -> Dict[str, Any]:
    if not is_ai_enabled():
        return {
            "response": "AI Copilot is not fully enabled. Please configure GROQ_API_KEY in your settings/environment."
        }
    
    user_msgs = [m for m in messages if m.get("role") == "user"]
    if not user_msgs:
        return {"response": "No user message found to process."}
        
    last_msg = user_msgs[-1].get("content", "")
    
    from app.services.intent_classifier import classify_intent
    from app.services.prompt_library import COPILOT_SYSTEM_PROMPT
    from app.models import Project, Client, Brand, Category, Market, KPI
    from sqlalchemy import or_

    intent = await classify_intent(last_msg)
    print(f"Copilot Intent classified: {intent}")
    
    # Always query global count overview to give the LLM full access to database volume stats
    total_projects = db.query(Project).count()
    total_clients = db.query(Client).count()
    total_brands = db.query(Brand).count()
    total_markets = db.query(Market).count()
    total_categories = db.query(Category).count()
    total_kpis = db.query(KPI).count()
    
    from sqlalchemy import func
    
    # Query distributions to make the Copilot highly intelligent about project coverage
    cat_counts = db.query(Category.name, func.count(Project.id)).outerjoin(Project).group_by(Category.name).all()
    market_counts = db.query(Market.name, func.count(Project.id)).outerjoin(Project).group_by(Market.name).all()
    kpi_counts = db.query(KPI.name, func.count(Project.id)).outerjoin(Project).group_by(KPI.name).all()
    
    cat_summary = ", ".join([f"{name}: {count}" for name, count in sorted(cat_counts, key=lambda x: x[1], reverse=True)])
    market_summary = ", ".join([f"{name}: {count}" for name, count in sorted(market_counts, key=lambda x: x[1], reverse=True)])
    kpi_summary = ", ".join([f"{name}: {count}" for name, count in sorted(kpi_counts, key=lambda x: x[1], reverse=True)])
    
    global_stats = (
        f"Global Database Overview (Use these metrics for overall or global counts):\n"
        f"- Total Project Credentials: {total_projects}\n"
        f"- Total Unique Clients: {total_clients}\n"
        f"- Total Unique Brands Modelled: {total_brands}\n"
        f"- Total Unique Markets/Countries: {total_markets}\n"
        f"- Total Unique Categories/Segments: {total_categories}\n"
        f"- Total Unique Dependent Variables (KPIs): {total_kpis}\n\n"
        f"Project Distribution by Category (casing normalized):\n{cat_summary}\n\n"
        f"Project Distribution by Market (geographic):\n{market_summary}\n\n"
        f"Project Distribution by dependent variable KPI:\n{kpi_summary}\n"
    )
    
    context = global_stats + "\n"
    
    # Always scan for mentioned entities (clients, brands, categories, markets, kpis) to enrich the context
    words_to_check = [w.strip(",.?!\"'()[]{} ").lower() for w in last_msg.split()]
    words_to_check = [w for w in words_to_check if len(w) > 3]
    
    mentioned_entities = []
    for word in words_to_check:
        if word in ["client", "brand", "market", "category", "project", "projects", "similar", "find", "show", "list", "about", "unilever"]:
            # If word is unilever but user is asking about it, we should check it, but let's exclude other generic keywords
            pass
        if word in ["client", "brand", "market", "category", "project", "projects", "similar", "find", "show", "list", "about"]:
            continue
            
        # 1. Client Lookup
        client_ent = db.query(Client).filter(Client.name.ilike(f"%{word}%")).first()
        if client_ent and client_ent.name not in [e["name"] for e in mentioned_entities]:
            unique_brands = sorted(list(set(p.brand.name for p in client_ent.projects)))
            unique_markets = sorted(list(set(p.market.name for p in client_ent.projects)))
            unique_categories = sorted(list(set(p.category.name for p in client_ent.projects)))
            unique_dvs = sorted(list(set(p.kpi.name for p in client_ent.projects if p.kpi)))
            
            # Find similar clients (sharing categories)
            cat_ids = [p.category_id for p in client_ent.projects if p.category_id]
            similar_clients = []
            if cat_ids:
                sim_query = db.query(Client.name, func.count(Project.id).label('overlap_count'))\
                    .join(Project)\
                    .filter(Project.category_id.in_(cat_ids))\
                    .filter(Project.client_id != client_ent.id)\
                    .group_by(Client.name)\
                    .order_by(func.count(Project.id).desc())\
                    .limit(5)\
                    .all()
                similar_clients = [f"{name} ({count} overlapping projects)" for name, count in sim_query]

            mentioned_entities.append({
                "type": "Client",
                "name": client_ent.name,
                "context": (
                    f"Detailed Context for Client '{client_ent.name}':\n"
                    f"- Total Projects: {len(client_ent.projects)}\n"
                    f"- Associated Brands: {', '.join(unique_brands)}\n"
                    f"- Associated Categories: {', '.join(unique_categories)}\n"
                    f"- Geographic Markets: {', '.join(unique_markets)}\n"
                    f"- Dependent Variables (DVs) / KPIs tracked: {', '.join(unique_dvs) if unique_dvs else 'None'}\n"
                    f"- Similar Clients in Database (based on category overlap): {', '.join(similar_clients) if similar_clients else 'None'}\n"
                )
            })
            
        # 2. Brand Lookup
        brand_ent = db.query(Brand).filter(Brand.name.ilike(f"%{word}%")).first()
        if brand_ent and brand_ent.name not in [e["name"] for e in mentioned_entities]:
            unique_clients = sorted(list(set(p.client.name for p in brand_ent.projects)))
            unique_markets = sorted(list(set(p.market.name for p in brand_ent.projects)))
            unique_categories = sorted(list(set(p.category.name for p in brand_ent.projects)))
            unique_dvs = sorted(list(set(p.kpi.name for p in brand_ent.projects if p.kpi)))
            
            # Find similar brands (sharing categories)
            cat_ids = [p.category_id for p in brand_ent.projects if p.category_id]
            similar_brands = []
            if cat_ids:
                sim_query = db.query(Brand.name, func.count(Project.id).label('overlap_count'))\
                    .join(Project)\
                    .filter(Project.category_id.in_(cat_ids))\
                    .filter(Project.brand_id != brand_ent.id)\
                    .group_by(Brand.name)\
                    .order_by(func.count(Project.id).desc())\
                    .limit(5)\
                    .all()
                similar_brands = [f"{name} ({count} overlapping projects)" for name, count in sim_query]

            mentioned_entities.append({
                "type": "Brand",
                "name": brand_ent.name,
                "context": (
                    f"Detailed Context for Brand '{brand_ent.name}':\n"
                    f"- Total Projects: {len(brand_ent.projects)}\n"
                    f"- Associated Clients: {', '.join(unique_clients)}\n"
                    f"- Associated Categories: {', '.join(unique_categories)}\n"
                    f"- Geographic Markets: {', '.join(unique_markets)}\n"
                    f"- Dependent Variables (DVs) / KPIs tracked: {', '.join(unique_dvs) if unique_dvs else 'None'}\n"
                    f"- Similar Brands in Database (based on category overlap): {', '.join(similar_brands) if similar_brands else 'None'}\n"
                )
            })

        # 3. Market Lookup
        market_ent = db.query(Market).filter(Market.name.ilike(f"%{word}%")).first()
        if market_ent and market_ent.name not in [e["name"] for e in mentioned_entities]:
            unique_clients = sorted(list(set(p.client.name for p in market_ent.projects)))
            unique_brands = sorted(list(set(p.brand.name for p in market_ent.projects)))
            unique_dvs = sorted(list(set(p.kpi.name for p in market_ent.projects if p.kpi)))
            mentioned_entities.append({
                "type": "Market",
                "name": market_ent.name,
                "context": (
                    f"Detailed Context for Market '{market_ent.name}':\n"
                    f"- Total Projects: {len(market_ent.projects)}\n"
                    f"- Associated Clients: {', '.join(unique_clients)}\n"
                    f"- Associated Brands Modelled: {', '.join(unique_brands)}\n"
                    f"- Dependent Variables (DVs) / KPIs tracked: {', '.join(unique_dvs) if unique_dvs else 'None'}\n"
                )
            })

        # 4. Category Lookup
        cat_ent = db.query(Category).filter(Category.name.ilike(f"%{word}%")).first()
        if cat_ent and cat_ent.name not in [e["name"] for e in mentioned_entities]:
            unique_clients = sorted(list(set(p.client.name for p in cat_ent.projects)))
            unique_brands = sorted(list(set(p.brand.name for p in cat_ent.projects)))
            unique_dvs = sorted(list(set(p.kpi.name for p in cat_ent.projects if p.kpi)))
            mentioned_entities.append({
                "type": "Category",
                "name": cat_ent.name,
                "context": (
                    f"Detailed Context for Category '{cat_ent.name}':\n"
                    f"- Total Projects: {len(cat_ent.projects)}\n"
                    f"- Associated Clients: {', '.join(unique_clients)}\n"
                    f"- Associated Brands Modelled: {', '.join(unique_brands)}\n"
                    f"- Dependent Variables (DVs) / KPIs tracked: {', '.join(unique_dvs) if unique_dvs else 'None'}\n"
                )
            })

    if mentioned_entities:
        context += "MENTIONED ENTITIES DETAIL FROM DATABASE:\n"
        for ent in mentioned_entities:
            context += ent["context"] + "\n\n"

    # Check if user is asking for complete lists of brands, clients, categories, etc.
    list_keywords = ["list", "names", "all", "every", "what are", "which are", "show me"]
    is_list_request = any(k in last_msg.lower() for k in list_keywords)
    
    if is_list_request:
        # Match filters (e.g. market = "India")
        all_markets = db.query(Market).all()
        all_categories = db.query(Category).all()
        
        matched_market_ids = []
        matched_category_ids = []
        
        for m in all_markets:
            if m.name.lower() in last_msg.lower():
                matched_market_ids.append(m.id)
        for c in all_categories:
            if c.name.lower() in last_msg.lower():
                matched_category_ids.append(c.id)
                
        entity_lists = []
        
        if "brand" in last_msg.lower():
            b_query = db.query(Brand.name).join(Project)
            if matched_market_ids:
                b_query = b_query.filter(Project.market_id.in_(matched_market_ids))
            if matched_category_ids:
                b_query = b_query.filter(Project.category_id.in_(matched_category_ids))
            brands_list = [r[0] for r in b_query.distinct().order_by(Brand.name).all()]
            if brands_list:
                entity_lists.append(f"Exhaustive list of all matching Brand names in database: {', '.join(brands_list)}")
                
        if "client" in last_msg.lower():
            cl_query = db.query(Client.name).join(Project)
            if matched_market_ids:
                cl_query = cl_query.filter(Project.market_id.in_(matched_market_ids))
            if matched_category_ids:
                cl_query = cl_query.filter(Project.category_id.in_(matched_category_ids))
            clients_list = [r[0] for r in cl_query.distinct().order_by(Client.name).all()]
            if clients_list:
                entity_lists.append(f"Exhaustive list of all matching Client names in database: {', '.join(clients_list)}")
                
        if "category" in last_msg.lower() or "segment" in last_msg.lower():
            cat_query = db.query(Category.name).join(Project)
            if matched_market_ids:
                cat_query = cat_query.filter(Project.market_id.in_(matched_market_ids))
            cats_list = [r[0] for r in cat_query.distinct().order_by(Category.name).all()]
            if cats_list:
                entity_lists.append(f"Exhaustive list of all matching Category names in database: {', '.join(cats_list)}")

        if "kpi" in last_msg.lower() or "dependent variable" in last_msg.lower():
            k_query = db.query(KPI.name).join(Project)
            if matched_market_ids:
                k_query = k_query.filter(Project.market_id.in_(matched_market_ids))
            kpis_list = [r[0] for r in k_query.distinct().order_by(KPI.name).all()]
            if kpis_list:
                entity_lists.append(f"Exhaustive list of all matching KPI names in database: {', '.join(kpis_list)}")
                
        if entity_lists:
            context += "COMPLETE MATCHING LISTS FROM DATABASE (Exhaustive, do not say these are samples):\n" + "\n".join(entity_lists) + "\n\n"
            
    if intent == "find_projects":
        search_words = [w.strip() for w in last_msg.split() if len(w.strip()) > 3]
        if search_words:
            filters = []
            for word in search_words[:3]:
                s = f"%{word}%"
                filters.append(or_(
                    Project.job_number.ilike(s),
                    Client.name.ilike(s),
                    Brand.name.ilike(s),
                    Category.name.ilike(s),
                    Market.name.ilike(s),
                    KPI.name.ilike(s)
                ))
            
            projects_query = db.query(Project).join(Client).join(Brand).join(Category).join(Market).outerjoin(KPI)
            if filters:
                projects_query = projects_query.filter(or_(*filters))
            
            projects = projects_query.limit(15).all()
            if projects:
                context += "Matching Project Credentials (Sample Subset of specific matching rows):\n"
                for p in projects:
                    context += f"- Job: {p.job_number} | Client: {p.client.name} | Brand: {p.brand.name} | Category: {p.category.name} | Market: {p.market.name} | KPI: {p.kpi.name if p.kpi else 'N/A'}\n"
            else:
                context += "No specific database rows directly matched these keywords, but global stats are accurate.\n"
                
    elif intent == "summarize_entity":
        pass
 
    mode_instruction = ""
    if mode == "quick":
        mode_instruction = "\n\nRESPONSE FORMAT REQUIREMENT: Provide a Quick Answer. Keep your response extremely brief, direct, and concise (maximum 1-2 sentences)."
    elif mode == "analysis":
        mode_instruction = "\n\nRESPONSE FORMAT REQUIREMENT: Provide an Analysis. Present a balanced response with key insights, formatted metrics, and structured bullet points (1-2 short paragraphs)."
    elif mode == "report":
        mode_instruction = "\n\nRESPONSE FORMAT REQUIREMENT: Provide a detailed Executive Report. Deliver a comprehensive strategy synthesis, deep-dive breakdown of metrics, and thorough recommendations using clean headings and bulleted sections."

    api_messages = [{"role": "system", "content": COPILOT_SYSTEM_PROMPT + mode_instruction + (f"\n\nContext Database Information:\n{context}" if context else "")}]
    
    for msg in messages[-15:]:
        api_messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        
    try:
        chat_completion = await client.chat.completions.create(
            messages=api_messages,
            model=settings.GROQ_MODEL,
            temperature=0.7,
            timeout=25.0
        )
        response_text = chat_completion.choices[0].message.content
        return {
            "response": response_text,
            "intent": intent,
            "context_used": context != "",
            "evidence": context
        }
    except Exception as e:
        print(f"Error generating copilot response: {e}")
        return {
            "response": f"Sorry, I encountered an issue processing that: Request timed out or API error ({str(e)})."
        }
