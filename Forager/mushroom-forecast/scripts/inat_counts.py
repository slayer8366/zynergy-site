import json, time, urllib.request, urllib.parse
UA={'User-Agent':'research-planning-script/0.1 (one-off counts)'}
def get(path, **p):
    url='https://api.inaturalist.org/v1/'+path+'?'+urllib.parse.urlencode(p)
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=40) as r: return json.load(r)
        except Exception as e: err=e; time.sleep(3)
    return {'error':str(err)}
ids=json.load(open('ids.json'))
groups={'Morels (Morchella)':[ids['Morchella']],'Chanterelles (Cantharellus)':[ids['Cantharellus']],'Chicken of the woods (Laetiporus)':[ids['Laetiporus']],
 'Hen of the woods (Grifola frondosa)':[ids['Grifola frondosa']],'King bolete (Boletus edulis s.s. label)':[ids['Boletus edulis']],'Boletus genus':[ids['Boletus']],
 'Craterellus (trumpets, winter chanterelle)':[ids['Craterellus']],'Hedgehogs (Hydnum)':[ids['Hydnum']],'Lobster (Hypomyces lactifluorum)':[ids['Hypomyces lactifluorum']],
 'Oysters (Pleurotus)':[ids['Pleurotus']],'Lions mane group (Hericium)':[ids['Hericium']],'Matsutake (T. murrillianum + magnivelare)':[ids['Tricholoma murrillianum'],ids['Tricholoma magnivelare']],
 'Cauliflower (Sparassis)':[ids['Sparassis']]}
out={}
for g,t in groups.items():
    tid=','.join(map(str,t)); base=dict(taxon_id=tid,place_id=97394,per_page=0)
    rg=get('observations',quality_grade='research',**base).get('total_results'); time.sleep(1.1)
    allv=get('observations',verifiable='true',**base).get('total_results'); time.sleep(1.1)
    ob=get('observations',quality_grade='research',geoprivacy='obscured,private',**base).get('total_results'); time.sleep(1.1)
    h=get('observations/histogram',quality_grade='research',date_field='observed',interval='month_of_year',taxon_id=tid,place_id=97394); time.sleep(1.1)
    m=h.get('results',{}).get('month_of_year',{}); tot=sum(m.values()) or 1
    top=sorted(m.items(),key=lambda kv:-kv[1])[:3]; share=sum(v for k,v in top)/tot
    out[g]=dict(rg=rg,verifiable=allv,hidden=ob,hidden_pct=round(100*ob/rg,1) if rg else None,top3_months=sorted(int(k) for k,v in top),top3_share=round(100*share))
    print(g,out[g])
json.dump(out,open('counts.json','w'),indent=1)
