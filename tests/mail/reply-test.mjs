// npx esbuild supabase/functions/api/lib/email.ts --bundle --format=esm --platform=neutral --outfile=tests/mail/email.mjs && node tests/mail/reply-test.mjs
import { buildEmail, buildReplyConfirmEmail } from './email.mjs';
let f=0; const check=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c)f++;};
const base={ recipientName:'Jaclyn Lee', sender:{name:'Stacey',business:'Lawfecta'}, link:'L', unsubscribeSender:'U', unsubscribeAll:'A' };
let e=buildEmail({...base, replyName:'Stacey'});
check(e.text.includes('Hit reply to say thanks to Stacey. Your reply goes straight to them.') && e.html.includes('Hit reply to say thanks to Stacey'), 'Reply line when replies go to the sender');
e=buildEmail(base);
check(!e.text.includes('Hit reply') && !e.html.includes('Hit reply'), 'No reply line when replies go to Slice of Thanks');
e=buildEmail({...base, locale:'es', replyName:'Stacey'});
check(e.text.includes('Responde a este correo'), 'Spanish reply line');
const c=buildReplyConfirmEmail({link:'https://x.test/c', email:'a@b.co'});
check(c.subject==='Confirm where replies to your pizzas go' && c.html.includes('https://x.test/c') && c.text.includes('a@b.co'), 'Confirm email');
console.log(f? f+' FAILED':'ALL PASSED');
