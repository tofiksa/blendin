-- Populate 10 onboarding questions + options (Norwegian). Idempotent per question/option row.

INSERT INTO question (quiz_template_version_id, sort_order, stem)
SELECT v.id,
  r.ord,
  r.stem
FROM quiz_template_version v
JOIN quiz_template qt ON qt.id = v.quiz_template_id
JOIN tenant t ON t.id = qt.tenant_id AND t.slug = 'demo'
CROSS JOIN (
  VALUES
    (1, $$Hva gir {name} den beste starten på arbeidsdagen?$$),
    (
      2,
      $$Hvordan har {name} kommet seg helskinnet til kontoret denne uken?$$
    ),
    (
      3,
      $$Hva har vært {name} sin foretrukne lunsjstil i løpet av uke én?$$
    ),
    (
      4,
      $$Hvis vi spoler frem til fredag ettermiddag: Hva er det første {name} gjør når helgen ringer inn?$$
    ),
    (
      5,
      $$Har {name} noen «faste romkamerater» hjemme som krever oppmerksomhet?$$
    ),
    (
      6,
      $$Hvordan ser skrivebordet til {name} ut etter fem dager på kontoret?$$
    ),
    (
      7,
      $$Hva har vært {name} sitt mest typiske samtaleemne i lunsjen så langt?$$
    ),
    (
      8,
      $$Hvis det står en skål med kontorsnack i nærheten, hva er {name} mest tilbøyelig til å nappe med seg?$$
    ),
    (9, $$Hvor lang reisevei har {name} til kontoret hver dag?$$),
    (
      10,
      $$Hvilken «kaffetype» beskriver {name} sin energi best etter denne første uken?$$
    )
) AS r (ord, stem)
WHERE v.version_number = 1
  AND qt.name = 'Standard · Uke én'
  AND NOT EXISTS (
    SELECT 1
    FROM question q
    WHERE q.quiz_template_version_id = v.id AND q.sort_order = r.ord
  );

INSERT INTO question_option (question_id, sort_order, label)
SELECT q.id,
  o.opt_ord,
  o.lbl
FROM question q
JOIN quiz_template_version v ON v.id = q.quiz_template_version_id
JOIN quiz_template qt ON qt.id = v.quiz_template_id
JOIN tenant t ON t.id = qt.tenant_id AND t.slug = 'demo'
CROSS JOIN (
  VALUES
    (1, 1, $$En rykende varm kopp svart kaffe.$$),
    (1, 2, $$Te eller noe med masse melkeskum og sirup.$$),
    (
      1,
      3,
      $$Koffeinfritt/ingenting – hun har naturlig morgenenergi!$$
    ),
    (
      2,
      1,
      $$Kollektivt (buss/bane/tog) – med musikk eller podcast på ørene.$$
    ),
    (2, 2, $$Spreking-varianten: Sykkel eller gange i frisk luft.$$),
    (2, 3, $$Bak rattet i egen bil.$$),
    (3, 1, $$Den tradisjonelle matpakken med klassisk pålegg.$$),
    (3, 2, $$Utforskning av kantina/lokale spiseplasser.$$),
    (
      3,
      3,
      $$Rester fra gårsdagens kulinariske middag.$$
    ),
    (
      4,
      1,
      $$Snører på seg turskoene for å komme seg ut i skog og mark.$$
    ),
    (
      4,
      2,
      $$Slenger seg på sofaen med en god serie, film eller bok.$$
    ),
    (
      4,
      3,
      $$Spretter en god flaske og er sosial med venner eller familie.$$
    ),
    (
      4,
      4,
      $$Dykker ned i et hobbyprosjekt (strikking, gaming, oppussing).$$
    ),
    (5, 1, $$Ja, en hund (eller flere) som må luftes.$$),
    (
      5,
      2,
      $$Ja, en katt (eller flere) som eier sofaen.$$
    ),
    (
      5,
      3,
      $$Nei, ingen kjæledyr – men kanskje en imponerende samling grønne planter?$$
    ),
    (
      6,
      1,
      $$Minimalistisk og strøkent (kun laptop og headset).$$
    ),
    (
      6,
      2,
      $$Organisert kaos (notatblokker, penner og post-its i skjønn forening).$$
    ),
    (
      6,
      3,
      $$Hjemmekoselig (egen fancy vannflaske og kaffekopp er allerede på plass).$$
    ),
    (
      7,
      1,
      $$Spørre og grave for å skjønne hvordan alt (og alle) fungerer her.$$
    ),
    (
      7,
      2,
      $$Prate løst og fast om vær, vind og helgeplaner.$$
    ),
    (
      7,
      3,
      $$Fortelle morsomme historier eller anekdoter fra tidligere opplevelser.$$
    ),
    (
      8,
      1,
      $$Noe med sjokolade (viktig for blodsukkeret!).$$
    ),
    (
      8,
      2,
      $$Det sunne alternativet: Frukt, bær eller nøtter.$$
    ),
    (
      8,
      3,
      $$Ingenting – hun motstår alle fristelser som en superhelt.$$
    ),
    (
      9,
      1,
      $$Kortreist! (Under 20 minutter, bor praktisk talt rundt hjørnet).$$
    ),
    (
      9,
      2,
      $$Den gylne middelvei (20–50 minutter – perfekt for en liten podcast).$$
    ),
    (
      9,
      3,
      $$En tapper pendler (Over 50 minutter reisevei hver vei).$$
    ),
    (
      10,
      1,
      $$Iskaffe: Rolig, avbalansert og herlig behersket.$$
    ),
    (
      10,
      2,
      $$Dobbel espresso: Sprudlende, effektiv og full av sprut!$$
    ),
    (
      10,
      3,
      $$Latte: Myk, pratsom, varm og veldig inkluderende.$$
    )
) AS o (q_ord, opt_ord, lbl)
WHERE v.version_number = 1
  AND qt.name = 'Standard · Uke én'
  AND q.sort_order = o.q_ord
  AND NOT EXISTS (
    SELECT 1
    FROM question_option x
    WHERE x.question_id = q.id AND x.sort_order = o.opt_ord
  );
