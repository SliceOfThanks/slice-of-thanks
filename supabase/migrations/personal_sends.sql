-- Personal pizzas (Stacey, 2026-10-24): a birthday or congrats pizza leaves off the business name, logo, button and gift.
-- The member can put a photo on the lid instead. The photo follows the logo plan rule. Additive: patches two functions in place.

do $$
declare d text;
begin
  d := pg_get_functiondef('public.sot_create_send(uuid,text,uuid,text,text,jsonb)'::regprocedure);
  if position('v_personal' in d) = 0 then
    d := replace(d, $a$  v_test boolean := coalesce((p->>'is_test')::boolean, false);$a$,
      $a$  v_test boolean := coalesce((p->>'is_test')::boolean, false);
  v_personal boolean := coalesce((p->'box'->>'personal')::boolean, false);$a$);
    d := replace(d, $a$  if v_box ? 'gift' then v_type := 'marketing'; end if;$a$,
      $a$  if v_personal then v_box := v_box - 'gift' - 'cta_url' - 'cta_label' - 'logo_url';
  else v_box := v_box - 'photo_url'; end if;
  if v_box ? 'gift' then v_type := 'marketing'; end if;$a$);
    d := replace(d, $a$    if v_box ? 'logo_url' and not$a$,
      $a$    if (v_box ? 'logo_url' or v_box ? 'photo_url') and not$a$);
    d := replace(d, $a$'business', v_m.business_name, 'send_as', v_m.send_as,
       'logo_url', case when v_special or coalesce((v_feat->>'logo')::boolean,false) then v_m.logo_url end,$a$,
      $a$'business', case when v_personal then null else v_m.business_name end,
       'send_as', case when v_personal then 'person' else v_m.send_as end, 'personal', v_personal,
       'logo_url', case when v_personal then case when v_special or coalesce((v_feat->>'logo')::boolean,false) then left(nullif(v_box->>'photo_url',''), 500) end
         when v_special or coalesce((v_feat->>'logo')::boolean,false) then v_m.logo_url end,$a$);
    if (length(d) - length(replace(d, 'v_personal', ''))) / length('v_personal') < 6 then raise exception 'sot_create_send patch did not apply'; end if;
    execute d;
  end if;

  d := pg_get_functiondef('public.sot_save_preset(uuid,jsonb)'::regprocedure);
  if position($a$'kind'$a$ in d) = 0 then
    d := replace(d, $a$'link', left(p->'data'->>'link', 300),$a$,
      $a$'link', left(p->'data'->>'link', 300), 'kind', case when p->'data'->>'kind' in ('business','personal') then p->'data'->>'kind' end,$a$);
    if position($a$'kind'$a$ in d) = 0 then raise exception 'sot_save_preset patch did not apply'; end if;
    execute d;
  end if;
end $$;
