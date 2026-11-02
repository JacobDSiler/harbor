import sys, json
from playwright.sync_api import sync_playwright
fails=[]
def check(n,c,x=''):
    print(('PASS ' if c else 'FAIL ')+n+(' '+str(x) if x and not c else ''))
    if not c: fails.append(n)
FAM = {'profiles':[{'id':1730000000000.5,'name':'Jasmine','gradeId':'4','avatar':'🦊','topicProgress':{},'quizHistory':[]}],'country':'IE','parentPin':''}
SS = {'1730000000000.5': {'songs':{'h1':{'title':'The Morning Breaks','best':92,'last':88,'plays':4,'at':1790000000000,'part':'Soprano'},'h2':{'title':'Come, Come Ye Saints','best':71,'last':71,'plays':1,'at':1789000000000,'part':'Alto'}},
  'games':{'h1':{'stars':3,'plays':4,'at':1790000000000},'h2':{'stars':2,'plays':1,'at':1789000000000}},
  'drills':{'interval':{'correct':18,'total':20,'at':1790000000000},'note-name':{'correct':3,'total':10,'at':1790000000000}},
  'badges':{'first_song':{'at':1},'sharp_90':{'at':2}},'totals':{'sings':5,'avgRecent':84,'lastAt':1790000000000}}}
FAKE = """
window.__DOCS = %s;
""" % json.dumps({'families/MA-AB12':FAM,'families/MA-AB12_ss':{'app':'cantillo','prog':SS}})
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/gstatic.com/**', lambda r: r.abort()); pg.route('**/fonts.g*/**', lambda r: r.abort())
    pg.add_init_script(FAKE)
    pg.add_init_script("localStorage.setItem('harbor.v1', '')")
    pg.goto('http://127.0.0.1:5180/index.html')
    # find storage key
    pg.evaluate("""() => { S.family='MA-AB12'; save(); window.fsLoad = async () => ({ db:{}, F:{
        doc:(db,c,id)=>({path:c+'/'+id}),
        getDoc: async (r)=>{ const d=window.__DOCS[r.path]; return { exists:()=>!!d, data:()=>d }; } } }); }""")
    pg.evaluate("refresh(true)")
    pg.wait_for_function("S.cache && S.cache.ss && S.cache.ss['1730000000000.5']", timeout=5000)
    check('Harbor reads the _ss record into its cache', True)
    s = pg.evaluate("ssSummary(profiles()[0])")
    check('stars/badges counted by the existing summary code', s['any'] and s['stars']==5 and s['badges']==2, s)
    tile = pg.evaluate("(()=>{S.child=String(profiles()[0].id); render(); return document.querySelector('[data-app=sing]').innerText})()")
    check('Sight Singing tile shows stars badge on the child home', '5' in tile and '★' in tile, tile)
    pg.evaluate("unlockedUntil = Date.now()+600000; location.hash = '#/parent/child/1730000000000.5'")
    pg.wait_for_timeout(500)
    txt = pg.inner_text('body')
    check('child page has a Sight Singing card with songs + best score', 'Sight Singing' in txt and 'The Morning Breaks' in txt and '92%' in txt, txt[-600:])
    check('drill accuracy shown', 'Intervals' in txt and '90%' in txt and 'Note names' in txt, '')
    check('summary line (sing-throughs, average)', '5 sing-throughs' in txt and 'recent average 84%' in txt)
    pg.evaluate("unlockedUntil = Date.now()+600000; location.hash = '#/parent'")
    pg.wait_for_timeout(500)
    check('kids list shows Singing row', 'Sight Singing' in pg.inner_text('body'))
    check('no page errors', not errs, errs)
    b.close()
print('\nALL PASSED' if not fails else '\nFAILED %s'%fails); sys.exit(1 if fails else 0)
