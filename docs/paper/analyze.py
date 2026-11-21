import json, statistics as st
from scipy.stats import wilcoxon
D='./'
def ms(a): return f"{st.mean(a):.3f} ± {st.pstdev(a):.3f}"
def wil(a,b):
    d=[x-y for x,y in zip(a,b)]
    if all(v==0 for v in d): return 'all equal'
    r=wilcoxon(a,b,zero_method='wilcox',alternative='two-sided')
    w=sum(1 for v in d if v>0); l=sum(1 for v in d if v<0)
    return f"p={r.pvalue:.2e} (thắng {w}, thua {l}, hòa {len(d)-w-l})"
B=json.load(open(D+'baselines-raw.json'))
print('=== Bảng I: mean ± sd, và Wilcoxon Hybrid vs others (fitness, overalloc)')
for sc in ['small','medium']:
    rows=B[sc]
    for k in ['greedy','csp','genetic','hybrid']:
        sel=[r[k] for r in rows if (r[k]['solved'] if k=='csp' else True)]
        print(sc,k,'n',len(sel),'f',ms([x['f'] for x in sel]),'s',ms([x['s'] for x in sel]),'sig',ms([x['sig'] for x in sel]),'o',ms([x['o'] for x in sel]),'cs',ms([x['cs'] for x in sel]),'ms',round(st.mean([x['ms'] for x in sel])))
    H=[r['hybrid'] for r in rows]
    for k in ['greedy','genetic']:
        O=[r[k] for r in rows]
        print(f"  {sc} Hybrid vs {k}: fitness {wil([x['f'] for x in H],[x['f'] for x in O])}; quá tải {wil([x['o'] for x in H],[x['o'] for x in O])}")
    # vs CSP on solved sets only
    idx=[i for i,r in enumerate(rows) if r['csp']['solved']]
    print(f"  {sc} Hybrid vs CSP (n={len(idx)} bộ CSP giải được): fitness {wil([rows[i]['hybrid']['f'] for i in idx],[rows[i]['csp']['f'] for i in idx])}")
G=json.load(open(D+'ga-vs-hybrid.json'))
print('=== Bảng II (ga-vs-hybrid)')
for sc in G:
    print(sc,'fitness',wil([x['f'] for x in G[sc]['hy']],[x['f'] for x in G[sc]['ga']]),'cg',wil([x['cg'] for x in G[sc]['hy']],[x['cg'] for x in G[sc]['ga']]))
try:
    T=json.load(open(D+'theta.json'))
except Exception as e:
    T=None; print('theta chưa xong')
if T:
    print('=== θ')
    for sc in T:
        rows=T[sc]
        for k in ['ga','hy0','hy0.25','hy0.5']:
            a=[r[k] for r in rows]
            extra=f" pairs {st.mean([x['pairs'] for x in a])*100:.1f}% reopened {st.mean([x['reopened'] for x in a]):.2f}" if k!='ga' else ''
            print(sc,k,'f',ms([x['f'] for x in a]),'s',f"{st.mean([x['s'] for x in a]):.1f}",'sig',f"{st.mean([x['sig'] for x in a]):.1f}",'o',f"{st.mean([x['o'] for x in a]):.2f}",'cg',f"{st.mean([x['cg'] for x in a]):.1f}",'gen',f"{st.mean([x['gen'] for x in a]):.1f}",'ms',round(st.mean([x['ms'] for x in a])),extra)
            if k!='ga': print('   vs GA', wil([x['f'] for x in a],[r['ga']['f'] for r in rows]))
        # convergence curves (carry-forward), gens 0..250 step 10
        for k in ['ga','hy0.5']:
            pts=[]
            for g in range(0,251,10):
                vals=[]
                for r in rows:
                    h=r[k]['hist']; v=None
                    for e in h:
                        if e['generation']<=g: v=e['fitness']
                    if v is None: v=h[0]['fitness']
                    vals.append(v)
                pts.append(f"({g},{st.mean(vals):.4f})")
            print('CURVE',sc,k,' '.join(pts))
