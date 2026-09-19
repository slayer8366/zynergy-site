import json, time, urllib.request, urllib.parse
UA={'User-Agent':'research-planning-script/0.1 (one-off counts)'}
def get(path, **p):
    url='https://api.inaturalist.org/v1/'+path+'?'+urllib.parse.urlencode(p)
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=30) as r:
                return json.load(r)
        except Exception as e:
            err=e; time.sleep(2)
    return {'error':str(err)}
pl=get('places/autocomplete',q='North America',per_page=5)
for x in pl.get('results',[])[:5]: print('PLACE',x['id'],x['display_name'],x.get('admin_level'))
names=[('Morchella','genus'),('Cantharellus','genus'),('Laetiporus','genus'),('Grifola frondosa','species'),('Boletus edulis','species'),
       ('Boletus','genus'),('Craterellus','genus'),('Hydnum','genus'),('Hypomyces lactifluorum','species'),('Pleurotus','genus'),
       ('Hericium','genus'),('Tricholoma murrillianum','species'),('Tricholoma magnivelare','species'),('Calvatia gigantea','species'),('Sparassis','genus')]
ids={}
for n,rk in names:
    r=get('taxa',q=n,rank=rk,per_page=5,iconic_taxa='Fungi')
    hit=[t for t in r.get('results',[]) if t['name']==n]
    if hit: ids[n]=hit[0]['id']
    else: print('NOHIT',n,[t['name'] for t in r.get('results',[])][:3])
    time.sleep(1.1)
json.dump(ids,open('ids.json','w')); print(ids)
