-- A Slice birthday gift: 14 days of The Whole Pie with 25 bonus emails (was 40). Stacey's decision, 2026-10-26.
do $$
declare d text;
begin
  select pg_get_functiondef('public.sot_birthday_claim(uuid)'::regprocedure) into d;
  if position('v_start, v_end, 40)' in d) = 0 or position('''bonus'', 40, v_end' in d) = 0 then raise exception 'birthday claim anchors not found'; end if;
  d := replace(d, 'v_start, v_end, 40)', 'v_start, v_end, 25)');
  d := replace(d, '''bonus'', 40, v_end', '''bonus'', 25, v_end');
  execute d;
  select pg_get_functiondef('public.sot_birthday_claim(uuid)'::regprocedure) into d;
  if position('v_start, v_end, 25)' in d) = 0 or position('''bonus'', 25, v_end' in d) = 0 then raise exception 'birthday claim not updated'; end if;
end $$;
