export default `
.adm{--bg:#0b0c10;--surf:#14161c;--surf2:#1a1d25;--line:rgba(255,255,255,.08);--ink:rgba(255,255,255,.9);--mute:rgba(255,255,255,.5);--acc:#FF6B35;--good:#2fbf8a;--warn:#e5a93a;--bad:#ef6a6a;--info:#5b9bf0;--violet:#9d92f0;
  background:var(--bg);color:var(--ink);min-height:100vh;font-family:Inter,system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.45}
.adm *{box-sizing:border-box}.adm a{color:inherit;text-decoration:none}.adm button{font-family:inherit}
.adm h1,.adm h2,.adm h3{margin:0}
.a-mute{color:var(--mute)}
/* shell */
.a-side{position:fixed;inset:0 auto 0 0;width:236px;background:#0e1015;border-right:1px solid var(--line);display:flex;flex-direction:column;z-index:40;overflow-y:auto}
.a-brand{display:flex;align-items:center;gap:10px;padding:18px 18px 14px;font-weight:800;font-size:17px;letter-spacing:-.01em}
.a-brand img{height:30px;width:auto;max-width:130px;object-fit:contain;display:block}
.a-brand .a-tag{margin:0;padding:3px 7px;border-radius:6px;background:rgba(255,107,53,.15);color:#FF6B35}
.a-brand i{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#FF6B35,#ff9a5c);display:block}
.a-brand small{display:block;font-size:10px;font-weight:600;color:var(--mute);letter-spacing:.08em;text-transform:uppercase}
.a-navg{padding:6px 10px 4px}.a-navg>span{display:block;padding:10px 10px 6px;font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.32)}
.a-nav{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;color:var(--mute);font-weight:600;font-size:13.5px}
.a-nav:hover{background:rgba(255,255,255,.04);color:var(--ink)}.a-nav.on{background:rgba(255,107,53,.12);color:#ff9a6c}
.a-nav svg{flex-shrink:0}.a-nav em{margin-left:auto;font-style:normal;font-size:10.5px;font-weight:800;background:var(--acc);color:#fff;border-radius:999px;padding:1px 7px}
.a-main{margin-left:236px;min-height:100vh}
.a-bar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:12px;padding:12px 24px;background:rgba(11,12,16,.9);backdrop-filter:blur(16px);border-bottom:1px solid var(--line)}
.a-bar .a-gs{flex:1;max-width:480px}
.a-burger{display:none;background:none;border:0;color:var(--ink);padding:6px;cursor:pointer}
.a-bar-r{margin-left:auto;display:flex;gap:8px;align-items:center}
.a-content{padding:24px;max-width:1280px;margin:0 auto}
.a-gsw{position:relative}.a-gsr{position:absolute;top:100%;left:0;right:0;margin-top:6px;background:var(--surf2);border:1px solid var(--line);border-radius:12px;max-height:360px;overflow-y:auto;z-index:60;box-shadow:0 20px 50px rgba(0,0,0,.5)}
.a-gsr a{display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--line)}.a-gsr a:hover{background:rgba(255,255,255,.04)}
.a-gsr small{display:block;color:var(--mute);font-size:11.5px}.a-gsr .t{font-size:10px;font-weight:800;text-transform:uppercase;color:var(--acc);width:62px;flex-shrink:0;padding-top:2px}
.a-tabbar{display:none}
@media(max-width:900px){
 .a-side{transform:translateX(-100%);transition:transform .2s;width:272px}.a-side.open{transform:none}
 .a-scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:39}
 .a-main{margin-left:0;padding-bottom:70px}.a-burger{display:block}.a-bar{padding:10px 14px}.a-content{padding:16px 14px}
 .a-tabbar{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;bottom:0;left:0;right:0;z-index:35;background:#0e1015;border-top:1px solid var(--line);padding:6px 4px calc(6px + env(safe-area-inset-bottom))}
 .a-tabbar a,.a-tabbar button{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:600;color:var(--mute);background:none;border:0;padding:6px 0;position:relative;cursor:pointer}
 .a-tabbar .on{color:#ff9a6c}.a-tabbar em{position:absolute;top:2px;right:24%;font-style:normal;font-size:9px;font-weight:800;background:var(--acc);color:#fff;border-radius:999px;padding:0 5px}
}
/* page header */
.a-ph{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.a-ph h1{font-size:24px;font-weight:800;letter-spacing:-.02em}.a-ph p{margin:4px 0 0;color:var(--mute);font-size:13.5px}
.a-back{display:inline-block;margin-bottom:6px;font-size:12.5px;color:var(--mute)}.a-back:hover{color:var(--ink)}
.a-ph-actions{display:flex;gap:8px;flex-wrap:wrap}
/* card */
.a-card{background:var(--surf);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-bottom:16px}
.a-card-h{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 18px;border-bottom:1px solid var(--line)}
.a-card-h h3{font-size:14px;font-weight:700}.a-card-h p{margin:2px 0 0;font-size:12px;color:var(--mute)}.a-card-b{padding:18px}
.a-card-actions{display:flex;gap:8px;align-items:center}
/* stats */
.a-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.a-stat{background:var(--surf);border:1px solid var(--line);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:3px;min-width:0;position:relative}
.a-stat.click{cursor:pointer}.a-stat.click:hover{border-color:rgba(255,255,255,.2)}
.a-stat-l{font-size:11.5px;font-weight:600;color:var(--mute);text-transform:uppercase;letter-spacing:.05em}
.a-stat-v{font-size:24px;font-weight:800;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a-stat-s{font-size:12px;color:var(--mute)}.a-stat-spark{margin-top:6px;opacity:.9}
.a-stat.tone-warn .a-stat-v{color:var(--warn)}.a-stat.tone-bad .a-stat-v{color:var(--bad)}.a-stat.tone-good .a-stat-v{color:var(--good)}
/* pills + buttons */
.a-pill{display:inline-block;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;text-transform:capitalize;white-space:nowrap;border:1px solid}
.a-pill.tone-good{color:var(--good);background:rgba(47,191,138,.1);border-color:rgba(47,191,138,.25)}
.a-pill.tone-warn{color:var(--warn);background:rgba(229,169,58,.1);border-color:rgba(229,169,58,.25)}
.a-pill.tone-bad{color:var(--bad);background:rgba(239,106,106,.1);border-color:rgba(239,106,106,.25)}
.a-pill.tone-info{color:var(--info);background:rgba(91,155,240,.1);border-color:rgba(91,155,240,.25)}
.a-pill.tone-violet{color:var(--violet);background:rgba(157,146,240,.1);border-color:rgba(157,146,240,.25)}
.a-pill.tone-mute{color:var(--mute);background:rgba(255,255,255,.05);border-color:var(--line)}
.a-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:rgba(255,255,255,.05);color:var(--ink);white-space:nowrap}
.a-btn:hover{background:rgba(255,255,255,.09)}.a-btn:disabled{opacity:.45;cursor:not-allowed}
.a-btn.sm{padding:5px 10px;font-size:12px;border-radius:8px}
.a-btn.primary{background:var(--acc);border-color:var(--acc);color:#fff}.a-btn.primary:hover{filter:brightness(1.08);background:var(--acc)}
.a-btn.danger{background:rgba(239,106,106,.12);border-color:rgba(239,106,106,.3);color:var(--bad)}
.a-btn.good{background:rgba(47,191,138,.12);border-color:rgba(47,191,138,.3);color:var(--good)}
/* tabs, segmented, inputs */
.a-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin-bottom:16px;scrollbar-width:none}
.a-tabs button{background:none;border:0;border-bottom:2px solid transparent;color:var(--mute);padding:10px 14px;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap;margin-bottom:-1px}
.a-tabs button.on{color:var(--ink);border-color:var(--acc)}.a-tabs em{font-style:normal;margin-left:6px;font-size:10.5px;background:rgba(255,255,255,.1);padding:1px 7px;border-radius:999px}
.a-seg{display:inline-flex;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;padding:3px}
.a-seg button{background:none;border:0;color:var(--mute);padding:5px 12px;border-radius:7px;font-size:12.5px;font-weight:700;cursor:pointer}.a-seg button.on{background:rgba(255,255,255,.12);color:var(--ink)}
.a-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.a-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:10px;padding:0 12px;color:var(--mute);flex:1;min-width:180px;max-width:380px}
.a-search input{flex:1;background:none;border:0;outline:0;color:var(--ink);padding:9px 0;font-size:13.5px;min-width:0}
.a-select{display:flex;align-items:center;gap:6px}.a-select span{font-size:12px;color:var(--mute)}
.a-select select,.a-field select,.a-field input,.a-field textarea,.a-input{background:rgba(255,255,255,.05);border:1px solid var(--line);color:var(--ink);border-radius:10px;padding:9px 11px;font-size:13.5px;outline:0;font-family:inherit;width:100%}
.a-select select{width:auto}.a-select option,.a-field option{background:#1a1d25}
.a-input:focus,.a-field input:focus,.a-field textarea:focus,.a-select select:focus{border-color:rgba(255,107,53,.5)}
.a-field{display:flex;flex-direction:column;gap:5px}.a-field>span{font-size:12px;font-weight:600;color:var(--mute)}.a-field small{color:var(--mute);font-size:11.5px}
.a-stack{display:flex;flex-direction:column;gap:12px}
/* table */
.a-tw{overflow-x:auto}.a-tw.busy{opacity:.6}
.a-table{width:100%;border-collapse:collapse}
.a-table th{text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);padding:10px 16px;border-bottom:1px solid var(--line);white-space:nowrap}
.a-table td{padding:12px 16px;border-bottom:1px solid var(--line);vertical-align:middle;font-size:13.5px}
.a-table tr:last-child td{border-bottom:0}.a-table tr.click{cursor:pointer}.a-table tr.click:hover td{background:rgba(255,255,255,.025)}
.a-ra{text-align:right;white-space:nowrap}.a-ra .a-btn{margin-left:6px}
.a-cards{display:none}
@media(max-width:760px){
 .a-table{display:none}.a-cards{display:flex;flex-direction:column;gap:10px;padding:12px}
 .a-rc{background:var(--surf2);border:1px solid var(--line);border-radius:14px;padding:12px}
 .a-rc-top{margin-bottom:10px}.a-rc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.a-rc-grid small{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin-bottom:2px}
 .a-rc-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
}
.a-usercell{display:flex;gap:10px;align-items:center;min-width:0}.a-usercell b{display:block;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a-usercell small{display:block;color:var(--mute);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a-av{border-radius:50%;object-fit:cover;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center}.a-av.ph{background:#232733;color:var(--mute);font-weight:800}
.a-pager{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid var(--line);font-size:12.5px;color:var(--mute);flex-wrap:wrap}.a-pager>div{display:flex;gap:6px}
.a-empty{text-align:center;padding:48px 16px;color:var(--mute)}.a-empty-ic{font-size:30px;opacity:.4}.a-empty b{display:block;color:var(--ink);margin-top:6px}.a-empty p{margin:4px 0 0;font-size:13px}
.a-skel{padding:18px;display:flex;flex-direction:column;gap:12px}.a-skel div{height:16px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.1),rgba(255,255,255,.05));background-size:200% 100%;animation:ash 1.2s linear infinite}
@keyframes ash{to{background-position:-200% 0}}
.a-error{margin:16px;padding:12px 14px;background:rgba(239,106,106,.08);border:1px solid rgba(239,106,106,.25);color:var(--bad);border-radius:12px;display:flex;gap:12px;justify-content:space-between;align-items:center}
.a-meter{height:7px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden}.a-meter div{height:100%;border-radius:99px;background:var(--info)}
.a-meter .tone-good{background:var(--good)}.a-meter .tone-warn{background:var(--warn)}.a-meter .tone-bad{background:var(--bad)}
/* kv, grid, timeline */
.a-kv{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px 20px}.a-kv dt{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute);margin-bottom:3px}.a-kv dd{margin:0;font-weight:600;word-break:break-word}
.a-grid{display:grid;gap:16px}.a-grid.c2{grid-template-columns:repeat(2,minmax(0,1fr))}.a-grid.c3{grid-template-columns:repeat(3,minmax(0,1fr))}.a-grid.c21{grid-template-columns:minmax(0,2fr) minmax(0,1fr)}
@media(max-width:900px){.a-grid.c2,.a-grid.c3,.a-grid.c21{grid-template-columns:minmax(0,1fr)}}
.a-tl{list-style:none;margin:0;padding:0}.a-tl li{display:flex;gap:12px;position:relative;padding-bottom:16px}.a-tl li:last-child{padding-bottom:0}
.a-tl i{width:11px;height:11px;border-radius:50%;background:var(--good);margin-top:4px;flex-shrink:0;z-index:1}.a-tl li.todo i{background:#2a2e3a}
.a-tl li:not(:last-child)::before{content:'';position:absolute;left:5px;top:16px;bottom:0;width:1px;background:var(--line)}.a-tl small{display:block;color:var(--mute);font-size:12px}
/* drawer */
.a-drawer-wrap{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:70;display:flex;justify-content:flex-end}
.a-drawer{width:min(var(--w),100%);height:100%;background:var(--surf);border-left:1px solid var(--line);display:flex;flex-direction:column}
.a-drawer header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--line)}.a-drawer header button{background:rgba(255,255,255,.06);border:0;color:var(--ink);width:30px;height:30px;border-radius:50%;cursor:pointer}
.a-drawer-b{padding:18px;overflow-y:auto;flex:1}
@media(max-width:760px){.a-drawer-wrap{align-items:flex-end}.a-drawer{width:100%;height:auto;max-height:90vh;border-left:0;border-top:1px solid var(--line);border-radius:20px 20px 0 0}}
/* charts */
.a-chart svg{display:block;max-width:100%}.a-chart-empty{display:flex;align-items:center;justify-content:center;color:var(--mute);font-size:13px}
.a-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:12px;color:var(--mute)}.a-legend i,.a-tip i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px}
.a-tip{position:absolute;pointer-events:none;background:#20232d;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12px;min-width:120px;z-index:5;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.a-tip b{display:block;margin-bottom:4px}.a-tip div{display:flex;align-items:center;gap:0}.a-tip span{margin-left:auto;padding-left:14px;font-weight:700}
.a-hbars{display:flex;flex-direction:column;gap:12px}.a-hbar-top{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:5px}.a-hbar-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.a-hbar-val{font-weight:700}
.a-hbar-track{height:8px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden}.a-hbar-track div{height:100%;border-radius:99px;transition:width .3s}.a-hbar-sub{font-size:11.5px;color:var(--mute);margin-top:3px}
.a-donut{display:flex;gap:20px;align-items:center;flex-wrap:wrap}.a-donut-legend{flex:1;min-width:150px;display:flex;flex-direction:column;gap:8px}.a-donut-legend div{display:flex;align-items:center;font-size:13px;gap:0}.a-donut-legend i{width:9px;height:9px;border-radius:3px;margin-right:8px}.a-donut-legend b{margin-left:auto}
.a-heat-grid{display:grid;gap:3px;align-items:center}.a-heat-col{font-size:10px;color:var(--mute);text-align:center}.a-heat-row{font-size:10.5px;color:var(--mute)}.a-heat-cell{aspect-ratio:1.4/1;border-radius:4px;min-height:14px}.a-heat-foot{font-size:12px;color:var(--mute);margin-top:8px;min-height:18px}
.a-funnel{display:flex;flex-direction:column;gap:12px}.a-funnel-top{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}.a-funnel-top em{font-style:normal;color:var(--mute);font-weight:500;margin-left:6px}
`
