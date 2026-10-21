#!/usr/bin/env python3
"""Freeze reviewed vivid-data-visions observations as an additive, conflict-checked SQL batch.
No network or credentials. SQL staging/finalization are emitted; nothing is executed.
"""
import argparse, collections, hashlib, itertools, json, math, pathlib, subprocess

PIN = '822bb10bfe320a930de157e6a9ef2c51adfd18d3'
BATCH = 'vivid_repository_20261021'
PREFIX = 'vivid.'
FILES = ['src/components/kunnat/municipal-data.json'] + [f'src/components/planeetta/{x}.json' for x in ['care-capacity-data','group-opportunity-data','local-adaptation-data','local-adaptation-cases','housing-wealth-data','ownership-cashflow-data']]

def require(ok, why):
    if not ok: raise ValueError(why)
def compact(x): return json.dumps(x,ensure_ascii=False,separators=(',',':'),sort_keys=True,allow_nan=False)
def sha(x): return hashlib.sha256(x if isinstance(x,bytes) else compact(x).encode()).hexdigest()
def literal(x): return "'"+x.replace("'","''")+"'"
def load(p): return json.loads(p.read_text(),parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))

def build(root):
    root=pathlib.Path(root).resolve()
    require(subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()==PIN,'Repository commit differs; review a new version first')
    sources={}
    def read(path):
        raw=(root/path).read_bytes()
        committed=subprocess.check_output(['git','-C',str(root),'show',f'{PIN}:{path}'])
        require(raw==committed,f'Uncommitted source change: {path}')
        sources[path]={'sha256':sha(raw),'url':f'https://github.com/tilastomuuttujat/vivid-data-visions/blob/{PIN}/{path}'}
        return load(root/path)
    data={p:read(p) for p in FILES}
    series={}; obs={}; groups=collections.defaultdict(dict); counts=collections.Counter(); duplicates=0
    def register(key,title,unit,domain,source,file,**meta):
        key=PREFIX+key
        if key not in series:
            series[key]=dict(series_key=key,title=title,unit=unit,theme=domain,source='THL / Sotkanet' if 'sotkanet' in source['url'] else 'Tilastokeskus / StatFin',source_url=source['url'],geography=meta.pop('geography','Finland; ryhmä- ja alueluokitus metadata.groups-kentässä'),frequency=meta.pop('frequency','annual'),description=meta.pop('description',title),data_class='observed',status='curated',published=True,metadata=dict(import_batch=BATCH,repository_commit=PIN,repository_file=file,source_retrieved=data[file]['retrieved'],source_request=source,causal_effect_identified=False,**meta))
        return key
    def put(key,year,group,label,value,extra=None):
        nonlocal duplicates
        require(isinstance(year,int) and 1850<=year<=2026,'Invalid year')
        require(value is None or (isinstance(value,(int,float)) and not isinstance(value,bool) and math.isfinite(value)),'Invalid value')
        k=(key,year,group); row=dict(y=year,g=group,v=value)
        if extra: row['m']=extra
        if k in obs:
            a=obs[k]['v'];require(a==value or (a is not None and value is not None and abs(a-value)<1e-5),f'Conflicting source observations {k}: {a} / {value}')
            duplicates+=1;return
        obs[k]=row; groups[key][group]=label
    # Municipality observations: verify every cell against archived primary JSON-stat2.
    f=FILES[0]; d=data[f]; raw={x:read(f'scripts/data/municipal-sources/{x}.json') for x in ['housing','income','keys','voting']}
    decoded={}
    for sid,r in raw.items():
        response=r['response'];levels=[]
        for dim in response['id']:
            idx=response['dimension'][dim]['category']['index'];levels.append(idx if isinstance(idx,list) else sorted(idx,key=idx.get))
        vals=response['value'];decoded[sid]={co:(vals[i] if isinstance(vals,list) else vals.get(str(i))) for i,co in enumerate(itertools.product(*levels))}
    def cell(sid,area,year,measure):
        r=raw[sid]; dims=r['response']['id']; co=[]
        for dim in dims:
            text=next(v['text'] for v in r['metadata']['variables'] if v['code']==dim)
            co.append(area if text in ['Alue','Maakunta ja kunta'] else str(year) if text=='Vuosi' else measure if text=='Tiedot' else 'SSS')
        return decoded[sid].get(tuple(co))
    srcs={s['id']:s for s in d['sources']}
    for i,ind in enumerate(d['indicators']):
        sid=ind['source']; source=dict(srcs[sid],archive_sha256=sources[f'scripts/data/municipal-sources/{sid}.json']['sha256'])
        geo=2025 if sid=='income' else 2026
        key=register(f'municipal.{ind["id"]}_a{geo}',ind['label'],'euroa, vuoden 2024 rahassa / kulutusyksikkö' if ind['id']=='income' else ind['unit'],ind['group'],source,f,geography=d['geography'],frequency='election' if ind['fixedYear'] else 'annual',definition=ind,validation_basis='archived_primary_response',area_classification_year=geo)
        for snapshot in d['snapshots']:
            for row in snapshot['rows']:
                year=ind['fixedYear'] or snapshot['year'];v=row['values'][i];expected=cell(sid,row['id'],year,ind['code'])
                if ind['formula']:
                    denominator=ind['formula'].split(' / ')[1].split(' × ')[0];factor=int(ind['formula'].split(' × ')[1]);denom=cell(sid,row['id'],year,denominator)
                    expected=expected/denom*factor if expected is not None and denom is not None and denom>0 else None
                require(expected==v or (expected is not None and v is not None and abs(expected-v)<0.0000006),f'Municipal raw mismatch {ind["id"]}/{row["id"]}/{year}')
                put(key,year,row['id'],row['name'],v)
    counts['municipal']=len(obs)
    # Care: retain absValue as a source auxiliary, never assume its unit is people.
    f=FILES[1];d=data[f]
    for ind in d['indicators']:
        iid=str(ind['id']);key=register('care.sotkanet_'+iid,ind['title'],'euroa / 75 vuotta täyttänyt asukas' if iid=='5439' else '%','Huolenpito ja terveydenhuolto',ind,f,description=ind['description'],validation_basis='repository_snapshot_and_source_metadata',known_break_years=[2019] if iid=='5513' else [],fixed_threshold=0.7 if iid=='5679' else None,threshold_basis='each_year_current_legal_requirement' if iid=='6035' else None,not_interchangeable_with=['5679'] if iid=='6035' else ['6035'] if iid=='5679' else [],geography='Sotkanet-alueet: koko maa, hyvinvointialueet, Helsinki ja Ahvenanmaa; ei historiallinen hallintorakenne')
        for reg in d['regions']:
            for y,vals in reg['values'].items():
                if iid in vals:
                    v=vals[iid];require(v['value'] is None or iid=='5439' or 0<=v['value']<=100,'Care share outside bounds')
                    put(key,int(y),'FI' if reg['id']==658 else 'SOTKA:'+str(reg['id']),reg['name'],v['value'],dict(source_abs_value=v.get('count'),source_abs_unit='1000 EUR' if iid=='5439' else 'source-defined auxiliary count'))
    counts['care']=len(obs)-sum(counts.values())
    # Cross sections: preserve five source categories; students are a subset of outside.
    f=FILES[2];d=data[f];regions={r['id']:r['name'] for r in d['regions']}
    education={'SSS':'Yhteensä','3_4':'Toinen aste tai erikoisammattitutkinto','5_6':'Alin tai alempi korkea-aste','7_8':'Ylempi korkea-aste tai tutkijakoulutus','9_X':'Ei perusasteen jälkeistä tutkintoa tai tuntematon'}
    for kind,table in [('education','115d'),('age','115w')]:
        keys=[register(f'groups.{kind}.{metric}',f'{label}, '+('koulutusryhmittäin (18–64 v.)' if kind=='education' else 'ikäryhmittäin'),'henkilöä','Työ ja koulutus',d['sources'][table],f,validation_basis='repository_snapshot_and_source_metadata',group_dimensions=['area','education' if kind=='education' else 'age'],area_classification_year=2025,sex='total',age='18-64' if kind=='education' else 'group',not_individual_transitions=True,known_break_years=[2005],method_note='Opiskelijat sisältyvät työvoiman ulkopuolisiin; koulutusryhmien ja tulotilaston koulutusluokitukset eroavat.') for metric,label in [('population','Väestö'),('employed','Työlliset'),('unemployed','Työttömät'),('outside','Työvoiman ulkopuolella'),('students','Opiskelijat')]]
        for reg,group,year,*vals in d[kind]:
            require(vals[0]==sum(vals[1:4]) and vals[4]<=vals[3],'Activity partition or student subset differs')
            groupkey=('FI' if reg=='SSS' else reg)+'|'+kind+'='+group
            label=regions[reg]+' / '+(education[group] if kind=='education' else group+' vuotta')
            for key,value in zip(keys,vals):put(key,int(year),groupkey,label,value)
    incomes={'SSS':'Yhteensä','3':'Toinen aste','456':'Alin/alempi korkea-aste tai erikoisammattitutkinto','78':'Ylempi korkea-aste tai tutkijakoulutus','9':'Ei perusasteen jälkeistä tutkintoa tai tuntematon'}
    ikeys=[register('groups.income.'+metric,title,unit,'Eriarvoisuus ja toimeentulo',d['sources']['14k5'],f,validation_basis='repository_snapshot_and_source_metadata',age='18-64',sex='total',poverty_threshold='60% of national equivalized disposable cash income median') for metric,title,unit in [('population','Asuntoväestö koulutuksen mukaan, 18–64-vuotiaat','henkilöä'),('poor','Pienituloiset koulutuksen mukaan, 18–64-vuotiaat','henkilöä'),('median','Ekvivalentin käytettävissä olevan rahatulon mediaani koulutuksen mukaan','euroa, vuoden 2024 rahassa')]]
    for group,year,pop,poor,median in d['income']:
        require(pop is not None and poor is not None and 0<=poor<=pop,'Poverty counts invalid')
        for key,value in zip(ikeys,[pop,poor,median]):put(key,int(year),'FI|education_income='+group,incomes[group],value)
    counts['groups']=len(obs)-sum(counts.values())
    # Local adaptation. Country comparator is already represented elsewhere; no blanket re-import.
    f=FILES[3];d=data[f];specs=[('workingAge','115b','Väestö 18–64-vuotiaat','henkilöä'),('employed','115b','Työlliset 18–64-vuotiaat','henkilöä'),('unemployed','115b','Työttömät 18–64-vuotiaat','henkilöä'),('outside','115b','Työvoiman ulkopuolella 18–64-vuotiaat','henkilöä'),('population','11ae','Väkiluku','henkilöä'),('domesticNet','11ae','Kuntien välinen nettomuutto','henkilöä'),('internationalNet','11ae','Nettomaahanmuutto','henkilöä'),('naturalChange','11ae','Luonnollinen väestönlisäys','henkilöä'),('educationPopulation','12bs','Väestö 20–64-vuotiaat','henkilöä'),('higherEducation','12bs','Korkea-asteen tutkinnon suorittaneet 20–64-vuotiaat','henkilöä'),('qualification','12bs','Perusasteen jälkeisen tutkinnon suorittaneet 20–64-vuotiaat','henkilöä'),('income','14ww','Mediaanitulo','euroa, vuoden 2024 rahassa / kulutusyksikkö'),('poverty','14ww','Pienituloisuusaste','%'),('jobseekers','12r5','Työttömät työnhakijat, 12 kuukauden lopun havaintojen keskiarvo','henkilöä'),('longTerm','12r5','Pitkäaikaistyöttömät, 12 kuukauden lopun havaintojen keskiarvo','henkilöä')]
    for field,table,title,unit in specs:
        key=PREFIX+f'municipal.{field}_a'+('2026' if field=='population' else '2025') if field in ['income','poverty','population'] else register('local.'+field,title,unit,'Alueellinen rakennemuutos',d['sources'][table],f,validation_basis='repository_snapshot_and_source_metadata',age='18-64' if table=='115b' else '20-64' if table=='12bs' else 'all',known_break_years=[2005] if table=='115b' else [],aggregation='arithmetic mean of 12 month-end stocks, not annual persons or LFS' if table=='12r5' else 'sum of nine 5-year age bands' if table=='12bs' else 'source observation',area_classification_year=2025 if table in ['115b','14ww'] else 2026)
        if field in ['income','poverty','population']:
            series[key]['metadata']['additional_source_requests']=[dict(repository_file=f,source_retrieved=d['retrieved'],**d['sources'][table])]
        for place in d['places']:
            if place['id']=='SSS':continue
            for p in place['points']:
                if p[field] is not None:put(key,p['year'],place['id'],place['name'],p[field],dict(repository_file=f,source_retrieved=d['retrieved']) if field in ['income','poverty','population'] else None)
    for sector in ['SSS','A','C','F','J','M','Q']:
        key=register('local.jobs_'+sector,'Alueella työssäkäyvät, toimiala '+sector,'työpaikkaa','Alueellinen rakennemuutos',d['sources']['115h'],f,validation_basis='repository_snapshot_and_source_metadata',area_classification_year=2026,industry_code=sector,industry_classification='TOL 2008',place_basis='workplace, not resident employed',not_additive_selected_sectors=True)
        for place in d['places']:
            if place['id']!='SSS':
                for p in place['points']:
                    if sector in p['jobs']:put(key,p['year'],place['id'],place['name'],p['jobs'][sector])
    counts['local']=len(obs)-sum(counts.values())
    # Household sample surveys: validate extracted values against bundled primary JSON responses.
    f=FILES[5];d=data[f]
    def response_value(table,coords,measure):
        resp=d['sources'][table]['response'];cols=[c['code'] for c in resp['columns'] if c['type']!='c'];measures=[c['code'] for c in resp['columns'] if c['type']=='c']
        row=next(r for r in resp['data'] if dict(zip(cols,r['key']))==coords);v=row['values'][measures.index(measure)]
        return None if v in ['.','..','...',''] else float(v)
    wealth_names=['Velaton omistusasunto','Omistusasunto ja asuntovelkaa','Vuokra-asunto tai muu'];age_names=['Alle 25','25–34','35–44','45–54','55–64','65–74','75 vuotta täyttäneet']
    for section,table,spec in [('wealth','151z',[('median','vtutk_mediaani_r','Nettovarallisuuden mediaani asumisryhmittäin','euroa, vuoden 2023 rahassa')]),('ages','151s',[('median','vtutk_mediaani_r','Nettovarallisuuden mediaani viitehenkilön iän mukaan','euroa, vuoden 2023 rahassa'),('owners','vtutk_kotitalousosuus','Pääasiallisen asunnon omistavien kotitalouksien osuus iän mukaan','%')]),('housing','12g4',[('income','kvkturahamod','Käytettävissä olevan rahatulon mediaani hallintasuhteen mukaan','euroa, vuoden 2024 rahassa / kulutusyksikkö'),('costShare','askpros2','Asumiskustannusten nettotulo-osuuden mediaani','%'),('expenditureShare','asmpros2','Asumismenojen nettotulo-osuuden mediaani','%')])]:
        for field,measure,title,unit in spec:
            key=register('housing_wealth.'+section+'.'+field,title,unit,'Omistus ja asuminen',d['sources'][table],f,frequency='survey_wave' if section!='housing' else 'annual',validation_basis='archived_primary_response',known_break_years=[2009,2013,2016] if section!='housing' else [2023] if field!='income' else [],not_interpolated=True,definition_note='Varallisuus: nettoae_DN3001_2; säästö-/sijoitusvakuutukset ja kryptovaluutat pois. Mediaani ehdollinen varallisuuslajin omistamiselle. Ikä on viitehenkilön ikä. Asumisen vuokraryhmä sisältää asumisoikeus- ja osaomistusasunnot; ryhmät eivät seuraa samoja kotitalouksia.')
            for r in d[section]:
                if section=='wealth':co=dict(vtutk_varlaji_6_20200101='nettoae_DN3001_2',hallintaperuste_1_20150401=r['group'],timeperiod_y=str(r['year']));label=wealth_names[int(r['group'])-1]
                elif section=='ages':co=dict(vtutk_varlaji_6_20200101='asarav' if field=='owners' else 'nettoae_DN3001_2',ikakausi_6_20120501=r['group'],timeperiod_y=str(r['year']));label=age_names[int(r['group'])-1]
                else:co=dict(timeperiod_y=str(r['year']),hallintasuhde_3_20120501=r['group'],pienituloisuus_2_20131220='ss');label='Omistusasunto' if r['group']=='1' else 'Vuokra-, asumisoikeus- tai osaomistusasunto'
                require(r[field]==response_value(table,co,measure),'Housing raw source differs')
                put(key,r['year'],'FI|'+section+'='+r['group'],label,r[field])
    counts['housing_wealth']=len(obs)-sum(counts.values())
    # Event evidence stays distinct from annual observations and from causal relations.
    cases=data[FILES[4]];ownership=data[FILES[6]]
    for t in ownership['transactions']:
        t['amount_unit']='million EUR';t['not_state_budget_receipt']=t['recipient']!='Suomen valtio';t['is_cash']=t['form'].startswith('Käteinen');t['is_annual_time_series_observation']=False
    for t in ownership['dividends']:t['unit']='EUR per share';t['is_state_receipt']=False;t['is_annual_time_series_observation']=False
    reports=[dict(id=BATCH+':local_cases',data=dict(cases,repository_commit=PIN,causal_effect_identified=False,series_keys=[k for k in series if '.local.' in k or '.municipal.' in k])),dict(id=BATCH+':ownership',data=dict(ownership,repository_commit=PIN,causal_effect_identified=False,is_annual_time_series=False,bridge_unit='million EUR'))]
    items=[]
    bycase={c['id']:c for c in cases['cases']}
    for event in cases['events']:
        c=bycase[event['caseId']]
        items.append(dict(id='vivid:local:'+event['id'],title=c['name']+': '+event['title'],year_start=event['year'],year_end=event['year'],type='tapahtuma',domains=['työ','aluerakenne'],phase='2000–2025',problem=event['text'],mechanism=c['mechanism'],effects=[],long_effect=event['limit'],current_relevance=c['note'],importance=3,confidence='kohtalainen',sources=[event['url'],sources[FILES[4]]['url']],unpublished=False,subtype=event['kind'],evidence_confidence='kohtalainen',interpretation_confidence='kehittyvä'))
    for i,t in enumerate(ownership['transactions']):
        items.append(dict(id='vivid:ownership:'+t['company']+':'+str(t['year'])+':'+str(i),title=t['title'],year_start=t['year'],year_end=t['year'],type='tapahtuma',domains=['omistus','julkinen talous'],phase='2000–2025',problem=f"{t['amount']} milj. euroa; vastaanottaja {t['recipient']}; {t['form']}.",mechanism='Omistusjärjestelyn rahavirta ja vastaanottaja; ei oletusta valtion budjettitulosta.',effects=[],long_effect=t['note'],current_relevance='Käteinen, osakepalautus, kauppahinta ja myyntivoitto erotettava.',importance=3,confidence='kohtalainen',sources=[ownership['sources'][t['source']],sources[FILES[6]]['url']],unpublished=False,subtype=t['form'],evidence_confidence='kohtalainen',interpretation_confidence='kehittyvä'))
    for k,s in series.items():
        rows=[v for (sk,y,g),v in obs.items() if sk==k];years=[r['y'] for r in rows]
        s.update(start_year=min(years),end_year=max(years),quality=dict(validation='source_snapshot_checked' if s['metadata']['validation_basis']=='archived_primary_response' else 'repository_checked_not_independently_refetched',observation_count=len(rows),missing_count=sum(r['v'] is None for r in rows)))
        s['metadata']['groups']=groups[k]
    payloads=[]
    for k,s in sorted(series.items()):
        rows=sorted([v for (sk,y,g),v in obs.items() if sk==k],key=lambda r:(r['y'],r['g']))
        for i in range(0,len(rows),1800):payloads.append(dict(series=s,values=rows[i:i+1800]))
    payloads.append(dict(reports=reports,items=items))
    manifest=dict(batch_id=BATCH,project_id='zzbubbrsgiqsvsovkkmf',repository_commit=PIN,sources=sources,counts=dict(counts,series=len(series),observations=len(obs),numeric_observations=sum(r['v'] is not None for r in obs.values()),missing_observations=sum(r['v'] is None for r in obs.values()),items=len(items),local_cases=3,local_events=11,ownership_transactions=4,dividend_payments=10),deduplicated_rows=duplicates,excluded=['municipal correlation families (derived screening, not causal edges)','local country comparator (existing national series)','household fictional profiles and forecasts','existing legislation manifest and overlapping budget/debt/redistribution imports'],stage_hashes=[sha(p) for p in payloads])
    return payloads,manifest


def stage_sql(payload,index):
    key=f'{BATCH}:stage:{index:03d}';envelope=dict(payload=compact(payload),sha256=sha(payload));j=literal(compact(envelope))
    tag='$vivid_'+sha(payload)+'$'
    while tag in j:tag=tag[:-1]+'x$'
    return f"BEGIN; DO {tag} DECLARE p jsonb:={j}::jsonb; BEGIN IF EXISTS(SELECT 1 FROM public.dataset_meta WHERE id={literal(key)} AND data<>p) THEN RAISE EXCEPTION 'Stage differs'; END IF; INSERT INTO public.dataset_meta(id,data) VALUES({literal(key)},p) ON CONFLICT(id) DO NOTHING; END {tag}; COMMIT; SELECT {index} AS stage_loaded;"


def finalize_sql(manifest,commit=False):
    keys=[f'{BATCH}:stage:{i:03d}' for i in range(len(manifest['stage_hashes']))];arr='ARRAY['+','.join(literal(k) for k in keys)+']'
    # Explicit owned columns. Fail closed on any conflicting existing canonical row.
    scols='series_key title description source source_url unit geography frequency start_year end_year data_class status theme quality metadata published'.split()
    sdef=', '.join(c+' '+('integer' if c in ['start_year','end_year'] else 'boolean' if c=='published' else 'jsonb' if c in ['quality','metadata'] else 'text') for c in scols)
    icols='id title year_start year_end type domains phase problem mechanism effects long_effect current_relevance importance confidence sources unpublished subtype evidence_confidence interpretation_confidence'.split()
    idef=', '.join(c+' '+('integer' if c in ['year_start','year_end','importance'] else 'boolean' if c=='unpublished' else 'text[]' if c in ['domains','effects','sources'] else 'text') for c in icols)
    return f"""BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('{BATCH}',0));
CREATE TEMP TABLE vivid_expected_stage ON COMMIT DROP AS SELECT * FROM jsonb_each_text({literal(compact(dict(zip(keys,manifest['stage_hashes']))))}::jsonb);
DO $vivid$ BEGIN IF EXISTS(SELECT 1 FROM vivid_expected_stage e LEFT JOIN public.dataset_meta t ON t.id=e.key WHERE t.id IS NULL OR t.data->>'sha256' IS DISTINCT FROM e.value OR encode(sha256(convert_to(t.data->>'payload','UTF8')),'hex') IS DISTINCT FROM e.value) THEN RAISE EXCEPTION 'Stage checksum mismatch'; END IF;
IF EXISTS(SELECT 1 FROM public.dataset_meta WHERE id='{BATCH}' AND data<>{literal(compact(manifest))}::jsonb) THEN RAISE EXCEPTION 'Batch manifest differs'; END IF; END $vivid$;
CREATE TEMP TABLE vivid_payload ON COMMIT DROP AS SELECT (data->>'payload')::jsonb AS data FROM public.dataset_meta WHERE id=ANY({arr});
DO $vivid$ BEGIN IF (SELECT count(*) FROM vivid_payload)<>{len(keys)} THEN RAISE EXCEPTION 'Missing stage'; END IF; END $vivid$;
CREATE TEMP TABLE vivid_series ON COMMIT DROP AS SELECT DISTINCT s.* FROM vivid_payload p CROSS JOIN LATERAL jsonb_to_record(p.data->'series') AS s({sdef}) WHERE p.data ? 'series';
CREATE TEMP TABLE vivid_values ON COMMIT DROP AS SELECT s.series_key,v.y AS year,v.g AS group_key,s.metadata->'groups'->>v.g AS group_label, v.v AS value, CASE WHEN v.v IS NULL THEN 'missing_source' ELSE s.quality->>'validation' END AS validation_status,s.source_url,'{PIN}'::text AS source_version,coalesce(v.m->>'source_retrieved',s.metadata->>'source_retrieved')::timestamptz AS source_retrieved_at,jsonb_build_object('import_batch','{BATCH}','repository_file',s.metadata->>'repository_file','known_break_years',coalesce(s.metadata->'known_break_years','[]'::jsonb))||coalesce(v.m,'{{}}'::jsonb) AS meta FROM vivid_payload p CROSS JOIN LATERAL jsonb_to_record(p.data->'series') AS s(series_key text,source_url text,metadata jsonb,quality jsonb) CROSS JOIN LATERAL jsonb_to_recordset(p.data->'values') AS v(y integer,g text,v numeric,m jsonb) WHERE p.data ? 'series';
CREATE TEMP TABLE vivid_items ON COMMIT DROP AS SELECT i.* FROM vivid_payload p CROSS JOIN LATERAL jsonb_to_recordset(p.data->'items') AS i({idef}) WHERE p.data ? 'items';
CREATE TEMP TABLE vivid_reports ON COMMIT DROP AS SELECT r.* FROM vivid_payload p CROSS JOIN LATERAL jsonb_to_recordset(p.data->'reports') AS r(id text,data jsonb) WHERE p.data ? 'reports';
DO $vivid$ BEGIN
IF (SELECT count(*) FROM vivid_series)<>{manifest['counts']['series']} OR (SELECT count(*) FROM vivid_values)<>{manifest['counts']['observations']} OR (SELECT count(*) FROM vivid_items)<>{manifest['counts']['items']} THEN RAISE EXCEPTION 'Count mismatch'; END IF;
IF EXISTS(SELECT 1 FROM vivid_values GROUP BY series_key,year,group_key HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate observation'; END IF;
IF EXISTS(SELECT 1 FROM vivid_series s JOIN public.indicator_series t USING(series_key) WHERE to_jsonb(t)-'created_at'-'updated_at'-'pressure_domain'-'indicator_role'-'lenses'-'interpretation'-'source_project_ref' IS DISTINCT FROM to_jsonb(s)) THEN RAISE EXCEPTION 'Existing series differs'; END IF;
IF EXISTS(SELECT 1 FROM vivid_values v JOIN public.indicator_values t USING(series_key,year,group_key) WHERE t.value IS DISTINCT FROM v.value OR t.meta IS DISTINCT FROM v.meta OR t.source_url IS DISTINCT FROM v.source_url OR t.source_version IS DISTINCT FROM v.source_version OR t.group_label IS DISTINCT FROM v.group_label OR t.validation_status IS DISTINCT FROM v.validation_status OR t.value_kind<>'observed' OR NOT t.is_published) THEN RAISE EXCEPTION 'Existing observation differs'; END IF;
IF EXISTS(SELECT 1 FROM vivid_items i JOIN public.items t USING(id) WHERE to_jsonb(t)-'created_at'-'updated_at' IS DISTINCT FROM to_jsonb(i)) THEN RAISE EXCEPTION 'Existing event differs'; END IF;
IF EXISTS(SELECT 1 FROM vivid_reports r JOIN public.dataset_meta t USING(id) WHERE t.data<>r.data) THEN RAISE EXCEPTION 'Existing report differs'; END IF;
END $vivid$;
INSERT INTO public.indicator_series({','.join(scols)}) SELECT {','.join(scols)} FROM vivid_series ON CONFLICT(series_key) DO NOTHING;
INSERT INTO public.indicator_values(series_key,year,group_key,group_label,value,value_kind,validation_status,is_published,source_url,source_version,source_retrieved_at,meta) SELECT series_key,year,group_key,group_label,value,'observed',validation_status,true,source_url,source_version,source_retrieved_at,meta FROM vivid_values ON CONFLICT(series_key,year,group_key) DO NOTHING;
INSERT INTO public.items({','.join(icols)}) SELECT {','.join(icols)} FROM vivid_items ON CONFLICT(id) DO NOTHING;
INSERT INTO public.dataset_meta(id,data) SELECT id,data FROM vivid_reports ON CONFLICT(id) DO NOTHING;
INSERT INTO public.dataset_meta(id,data) VALUES('{BATCH}',{literal(compact(manifest))}::jsonb) ON CONFLICT(id) DO NOTHING;
SELECT count(*) AS observations, count(value) AS numeric_observations,count(*)-count(value) AS missing_observations,count(distinct series_key) AS series FROM public.indicator_values WHERE meta->>'import_batch'='{BATCH}';
{'COMMIT' if commit else 'ROLLBACK'};
"""

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--repo',required=True);p.add_argument('--output',required=True);a=p.parse_args()
    payloads,manifest=build(a.repo);out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True)
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    for i,payload in enumerate(payloads):(out/f'stage-{i:03d}.sql').write_text(stage_sql(payload,i))
    (out/'dry-run.sql').write_text(finalize_sql(manifest));(out/'commit.sql').write_text(finalize_sql(manifest,True))
    print(json.dumps(dict(manifest['counts'],stages=len(payloads),deduplicated_rows=manifest['deduplicated_rows']),ensure_ascii=False))
if __name__=='__main__':main()
