from pathlib import Path
import json,html
root=Path(__file__).resolve().parents[1]
packet=json.loads((root/'stories/stories.json').read_text())
stories=packet['stories'];esc=html.escape
for index,story in enumerate(stories):
    sections=[]
    for title,paragraphs in story['sections']:
        text=''.join('<p>'+esc(p)+''.join(f' <a class="source-ref" href="#source-{r}" aria-label="Lähde {r}">[{r}]</a>' for r in refs)+'</p>' for p,refs in paragraphs)
        sections.append('<section><h2>'+esc(title)+'</h2>'+text+'</section>')
    sources=''.join(f'<li id="source-{i}"><a href="{esc(url,quote=True)}">{esc(title)}</a></li>' for i,(title,url) in enumerate(story['sources'],1))
    links=''.join(f'<a href="{esc(other["slug"])}.html"'+(' aria-current="page"' if i==index else '')+'>'+esc(other['title'])+'</a>' for i,other in enumerate(stories))
    words=sum(len(p.split()) for _,paragraphs in story['sections'] for p,_ in paragraphs)
    back=f'../murrokset1.html?story={index}'
    page=f'''<!doctype html><html lang="fi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(story['title'])} — Murrosatlas</title><meta name="description" content="{esc(story['lead'],quote=True)}"><link rel="stylesheet" href="./stories.css"></head><body><header class="site-header"><a href="{back}">← Takaisin kartastoon</a><span>MURROSATLAS</span></header><main id="main"><article><header><p class="place">{esc(story['place'])}</p><h1>{esc(story['title'])}</h1><p class="kind">{esc(story['kind'])} · noin {max(2,round(words/180))} min</p><p class="lead">{esc(story['lead'])}</p></header>{''.join(sections)}<section class="sources"><h2>Lähteet ja tulkinnan rajat</h2><p>Historialliset havainnot on merkitty lähdeviitteillä. Niitä yhdistävä yhteensovittamisen tulkinta on Murrosatlaksen toimituksellinen tulkinta. Teksti ei kuvaa keksittyä perhettä dokumentoituna tapauksena. Tulevaisuuskertomus on ehdollinen vaihtoehto.</p><ol>{sources}</ol></section></article><nav class="story-navigation" aria-label="Muut kertomukset"><h2>Jatka ison kuvan tutkimista</h2>{links}</nav><a class="back" href="{back}">← Palaa tämän kertomuksen kohtaan kartastossa</a></main></body></html>'''
    (root/'stories'/f'{story["slug"]}.html').write_text(page+'\n')
print(f'Built {len(stories)} readable stories.')
