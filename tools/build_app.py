"""Builds app/app.js from the approved prototype plus app/live.js.

The prototype stays the design source of truth. This script:
1. Takes its CSS and markup and mounts them in a shadow root, so the BD theme cannot change the look.
2. Points every DOM lookup at that shadow root.
3. Removes prototype sample defaults.
4. Inserts the live layer (app/live.js) at the end of the prototype's main scope.
Run: python3 tools/build_app.py
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "prototype/slice-of-thanks-prototype.html").read_text()
live = (ROOT / "app/live.js").read_text()

css = src[src.index("<style>") + 7 : src.index("</style>")]
markup = src[src.index("</style>") + 8 : src.index("<script>")]
script = src[src.index("<script>") + 8 : src.rindex("</script>")]

def must_replace(s, a, b, count=None):
    n = s.count(a)
    if n == 0 or (count is not None and n != count):
        sys.exit(f"build_app: expected {count or 'some'} of {a[:60]!r}, found {n}")
    return s.replace(a, b)

# CSS: :root becomes the shadow host, body becomes the inner wrapper
css = must_replace(css, ":root{", ":host{", 1)
css = must_replace(css, '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){', "@media (prefers-color-scheme: dark){:host{", 1)
if ':root[data-theme="dark"]' in css:
    css = css.replace(':root[data-theme="dark"]', ':host([data-theme="dark"])')
css = must_replace(css, "\nbody{", "\n.sot-body{", 1)
css = must_replace(css, "body.is-free ", ":host(.is-free) ")
css = ":host{display:block;all:initial}\n" + css

# Markup: drop head-only tags, wrap in the body stand-in
lines = [l for l in markup.split("\n") if not l.strip().startswith(("<link", "<meta", "<title"))]
markup = '<div class="sot-body">' + "\n".join(lines) + "</div>"

# Script: look things up inside the shadow root
script = script.replace("document.querySelectorAll(", "SOTR.querySelectorAll(")
script = script.replace("document.querySelector(", "SOTR.querySelector(")
script = must_replace(script, "document.body.classList", "SOTR.host.classList")
script = must_replace(script,
    "const DEFAULT_PROFILE={name:'Stacey Lake',business:'Lawfecta',logo:null,link:'https://www.lawfecta.com',linkLabel:'Book a follow-up',",
    "const DEFAULT_PROFILE={name:'',business:'',logo:null,link:'',linkLabel:'Book a follow-up',", 1)
script = must_replace(script, "sign:'Warmly, Stacey',boxStyle:'kraft'", "sign:'',boxStyle:'kraft'", 1)
script = must_replace(script, "const m4=meetings.find(m=>m.id==='m4');", "const m4=meetings.find(m=>m.id==='m4')||{status:'none'};", 1)
script = script.replace("localStorage.getItem('zabreak_'", "localStorage.getItem('sot_'").replace("localStorage.setItem('zabreak_'", "localStorage.setItem('sot_'")

# Insert the live layer before the main scope closes (the last "})();")
end = script.rindex("})();")
script = script[:end] + "\n" + live + "\n" + script[end:]

boot = """/* Slice of Thanks member app. Built by tools/build_app.py from the approved prototype and app/live.js. */
(function(){
var host=document.getElementById('sot-app');
if(!host||host.shadowRoot)return;
if(!document.getElementById('sot-fonts')){var fl=document.createElement('link');fl.id='sot-fonts';fl.rel='stylesheet';
fl.href='https://fonts.googleapis.com/css2?family=Shrikhand&family=Yellowtail&family=Work+Sans:wght@400;500;600;700&family=Caveat:wght@500;700&family=Courier+Prime:wght@400;700&display=swap';document.head.appendChild(fl);}
var SOTR=host.attachShadow({mode:'open'});
SOTR.innerHTML='<style>'+%s+'</style>'+%s;
window.__SOT_ROOT=SOTR;
""" % (json.dumps(css), json.dumps(markup))

out = boot + script + "\n})();\n"
(ROOT / "app/app.js").write_text(out)
print(f"app/app.js written: {len(out):,} bytes")
