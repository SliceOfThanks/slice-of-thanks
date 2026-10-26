-- Allow the recipient page to record receipt_shared (Share my receipt). Applied 2026-10-26 with a self-check.
do $$ declare d text; begin
  d := pg_get_functiondef('sot_recipient_event'::regproc);
  if position('receipt_shared' in d) > 0 then return; end if;
  if position('''send_back_started'')' in d) = 0 then raise exception 'anchor not found'; end if;
  d := replace(d, '''send_back_started'')', '''send_back_started'',''receipt_shared'')');
  execute d;
end $$;
