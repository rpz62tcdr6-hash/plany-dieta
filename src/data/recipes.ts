import type { Ingredient, MealType, Recipe } from '../types'
import { defaultFoods } from './foods'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  sniadanie: 'Śniadanie',
  obiad: 'Obiad',
  kolacja: 'Kolacja',
  przekaska: 'Przekąska',
}

const idByName = new Map(defaultFoods.map((f) => [f.name, f.id]))

/** Składnik po nazwie produktu z bazy – literówka w nazwie od razu zgłosi błąd */
function i(name: string, grams: number): Ingredient {
  const foodId = idByName.get(name)
  if (!foodId) throw new Error(`Brak produktu w bazie: ${name}`)
  return { foodId, grams }
}

const S: MealType = 'sniadanie'
const O: MealType = 'obiad'
const K: MealType = 'kolacja'
const P: MealType = 'przekaska'

const list: [string, MealType[], Ingredient[], string][] = [
  // ——— Śniadania ———
  [
    'Owsianka proteinowa z borówkami',
    [S],
    [i('Płatki owsiane', 60), i('Mleko 2%', 200), i('Odżywka białkowa (WPC)', 25), i('Borówki', 80)],
    'Płatki zagotuj z mlekiem (2–3 min). Zdejmij z ognia, wmieszaj odżywkę, na wierzch borówki.',
  ],
  [
    'Jajecznica z pomidorem i pieczywem',
    [S, K],
    [i('Jajko kurze (całe)', 150), i('Masło', 5), i('Pomidor', 120), i('Chleb żytni razowy', 70)],
    'Jajka usmaż na maśle na małym ogniu. Podawaj z pomidorem i pieczywem.',
  ],
  [
    'Twarożek z rzodkiewką i ogórkiem',
    [S, K],
    [
      i('Twaróg półtłusty', 150),
      i('Jogurt naturalny 2%', 50),
      i('Rzodkiewka', 60),
      i('Ogórek', 80),
      i('Chleb żytni razowy', 70),
    ],
    'Twaróg rozgnieć z jogurtem, dodaj pokrojone warzywa, dopraw solą i pieprzem. Podawaj z pieczywem.',
  ],
  [
    'Skyr z owocami i orzechami',
    [S, P],
    [i('Skyr naturalny', 200), i('Truskawki', 100), i('Płatki owsiane', 30), i('Orzechy włoskie', 15), i('Miód', 10)],
    'Skyr przełóż do miseczki, dodaj płatki, owoce, posiekane orzechy i polej miodem.',
  ],
  [
    'Omlet owsiany z bananem',
    [S],
    [i('Jajko kurze (całe)', 100), i('Płatki owsiane', 40), i('Banan', 100), i('Masło orzechowe', 15)],
    'Jajka wymieszaj z płatkami i połową rozgniecionego banana. Smaż na patelni z obu stron. Podawaj z resztą banana i masłem orzechowym.',
  ],
  [
    'Kanapki z szynką z indyka i hummusem',
    [S, K],
    [
      i('Chleb żytni razowy', 100),
      i('Hummus', 30),
      i('Szynka z indyka', 80),
      i('Pomidor', 100),
      i('Sałata', 20),
    ],
    'Pieczywo posmaruj hummusem, ułóż sałatę, szynkę i plastry pomidora.',
  ],
  [
    'Tofucznica z papryką',
    [S, K],
    [
      i('Tofu naturalne', 180),
      i('Papryka czerwona', 80),
      i('Cebula', 40),
      i('Oliwa z oliwek', 5),
      i('Chleb żytni razowy', 70),
    ],
    'Cebulę i paprykę podsmaż na oliwie, dodaj rozkruszone tofu, dopraw kurkumą, solą i pieprzem. Smaż 5 min.',
  ],
  [
    'Pudding chia z malinami',
    [S, P],
    [i('Nasiona chia', 25), i('Napój sojowy niesłodzony', 200), i('Maliny', 80), i('Miód', 10)],
    'Chia zalej napojem sojowym, wymieszaj i odstaw na noc do lodówki. Rano dodaj maliny i miód.',
  ],
  [
    'Kanapki z jajkiem i awokado',
    [S, K],
    [i('Chleb żytni razowy', 80), i('Awokado', 50), i('Jajko kurze (całe)', 100), i('Pomidor', 80)],
    'Jajka ugotuj na twardo (9 min). Pieczywo posmaruj rozgniecionym awokado, ułóż plastry jajka i pomidora.',
  ],
  // ——— Obiady ———
  [
    'Kurczak z ryżem i brokułem',
    [O],
    [
      i('Pierś z kurczaka (surowa)', 150),
      i('Ryż biały (suchy)', 70),
      i('Brokuł', 200),
      i('Oliwa z oliwek', 10),
    ],
    'Ryż ugotuj. Kurczaka pokrój, dopraw (papryka, czosnek, sól) i usmaż na oliwie. Brokuł ugotuj na parze 5–6 min.',
  ],
  [
    'Łosoś z ziemniakami i szpinakiem',
    [O, K],
    [
      i('Łosoś (surowy)', 130),
      i('Ziemniaki', 250),
      i('Szpinak', 100),
      i('Czosnek', 5),
      i('Oliwa z oliwek', 5),
    ],
    'Ziemniaki ugotuj. Łososia piecz 15 min w 200°C. Szpinak podsmaż krótko z czosnkiem na oliwie.',
  ],
  [
    'Spaghetti bolognese',
    [O],
    [
      i('Makaron pszenny (suchy)', 80),
      i('Wołowina chuda (surowa)', 120),
      i('Passata pomidorowa', 150),
      i('Cebula', 40),
      i('Oliwa z oliwek', 5),
    ],
    'Cebulę zeszklij na oliwie, dodaj mięso mielone i smaż do zrumienienia. Wlej passatę, dopraw oregano i duś 15 min. Podawaj z makaronem.',
  ],
  [
    'Indyk z kaszą gryczaną i warzywami',
    [O],
    [
      i('Pierś z indyka (surowa)', 150),
      i('Kasza gryczana (sucha)', 70),
      i('Mieszanka warzyw mrożonych', 200),
      i('Oliwa z oliwek', 10),
    ],
    'Kaszę ugotuj. Indyka pokrój i usmaż na oliwie, dodaj warzywa i duś pod przykryciem 8–10 min.',
  ],
  [
    'Dorsz z batatami i surówką z marchewki',
    [O],
    [i('Dorsz (surowy)', 180), i('Bataty', 250), i('Marchew', 100), i('Oliwa z oliwek', 10)],
    'Bataty pokrój w kostkę i piecz 25 min w 200°C. Dorsza piecz 12–15 min. Marchew zetrzyj i skrop oliwą.',
  ],
  [
    'Chili con carne z ryżem',
    [O],
    [
      i('Wołowina chuda (surowa)', 120),
      i('Fasola czerwona (konserwowa, odsączona)', 100),
      i('Pomidory krojone (puszka)', 200),
      i('Cebula', 40),
      i('Ryż biały (suchy)', 60),
      i('Oliwa z oliwek', 5),
    ],
    'Cebulę i mięso podsmaż na oliwie, dodaj pomidory, fasolę, kumin i chili. Duś 20 min. Podawaj z ryżem.',
  ],
  [
    'Curry z ciecierzycą i szpinakiem',
    [O],
    [
      i('Ciecierzyca (konserwowa, odsączona)', 150),
      i('Pomidory krojone (puszka)', 150),
      i('Mleczko kokosowe', 50),
      i('Szpinak', 80),
      i('Ryż biały (suchy)', 60),
    ],
    'Pomidory zagotuj z przyprawą curry, dodaj ciecierzycę i mleczko kokosowe, duś 10 min. Na koniec wmieszaj szpinak. Podawaj z ryżem.',
  ],
  [
    'Makaron z kurczakiem, cukinią i mozzarellą',
    [O],
    [
      i('Makaron pełnoziarnisty (suchy)', 80),
      i('Pierś z kurczaka (surowa)', 130),
      i('Cukinia', 150),
      i('Pomidor', 100),
      i('Ser mozzarella light', 40),
      i('Oliwa z oliwek', 5),
    ],
    'Kurczaka i cukinię podsmaż na oliwie, dodaj pomidora. Wymieszaj z ugotowanym makaronem i porwaną mozzarellą.',
  ],
  [
    'Schab z kaszą jaglaną i brokułem',
    [O],
    [i('Schab (surowy)', 150), i('Kasza jaglana (sucha)', 60), i('Brokuł', 150), i('Oliwa z oliwek', 5)],
    'Schab rozbij, dopraw i usmaż na oliwie (lub upiecz). Kaszę ugotuj, brokuł na parze.',
  ],
  [
    'Dal z czerwonej soczewicy',
    [O, K],
    [
      i('Soczewica czerwona (sucha)', 70),
      i('Pomidory krojone (puszka)', 150),
      i('Cebula', 50),
      i('Czosnek', 5),
      i('Ryż biały (suchy)', 50),
      i('Oliwa z oliwek', 10),
    ],
    'Cebulę i czosnek zeszklij na oliwie, dodaj soczewicę, pomidory, kurkumę i 300 ml wody. Gotuj 15 min. Podawaj z ryżem.',
  ],
  [
    'Tortilla z kurczakiem i warzywami',
    [O, K],
    [
      i('Tortilla pszenna pełnoziarnista', 120),
      i('Pierś z kurczaka (surowa)', 120),
      i('Papryka czerwona', 100),
      i('Kukurydza konserwowa', 40),
      i('Sałata', 30),
      i('Jogurt grecki 2%', 40),
    ],
    'Kurczaka pokrój w paski i usmaż z przyprawą meksykańską. Tortille posmaruj jogurtem, nałóż kurczaka, warzywa i zawiń.',
  ],
  [
    'Bulgur z warzywami i fetą',
    [O, K],
    [
      i('Kasza bulgur (sucha)', 70),
      i('Cukinia', 150),
      i('Papryka czerwona', 100),
      i('Ser feta', 50),
      i('Oliwa z oliwek', 10),
    ],
    'Bulgur ugotuj. Warzywa pokrój i podsmaż na oliwie. Wymieszaj z kaszą i pokruszoną fetą.',
  ],
  [
    'Makaron z krewetkami i pomidorami',
    [O],
    [
      i('Krewetki (surowe)', 150),
      i('Makaron pszenny (suchy)', 80),
      i('Pomidor', 150),
      i('Czosnek', 5),
      i('Oliwa z oliwek', 10),
    ],
    'Czosnek podsmaż na oliwie, dodaj krewetki (2–3 min) i pokrojone pomidory. Wymieszaj z ugotowanym makaronem.',
  ],
  [
    'Udka z kurczaka z ziemniakami i surówką',
    [O],
    [
      i('Udo z kurczaka bez skóry (surowe)', 160),
      i('Ziemniaki', 250),
      i('Marchew', 80),
      i('Jabłko', 50),
      i('Oliwa z oliwek', 5),
    ],
    'Udka dopraw i piecz 35 min w 200°C. Ziemniaki ugotuj. Marchew i jabłko zetrzyj na surówkę, skrop oliwą.',
  ],
  // ——— Kolacje ———
  [
    'Sałatka z tuńczykiem i jajkiem',
    [K, O],
    [
      i('Tuńczyk w sosie własnym', 120),
      i('Jajko kurze (całe)', 50),
      i('Sałata', 80),
      i('Pomidor', 100),
      i('Ogórek', 100),
      i('Kukurydza konserwowa', 50),
      i('Oliwa z oliwek', 10),
      i('Chleb żytni razowy', 50),
    ],
    'Jajko ugotuj na twardo. Warzywa pokrój, dodaj tuńczyka i jajko, polej oliwą. Podawaj z pieczywem.',
  ],
  [
    'Sałatka grecka z kurczakiem',
    [K, O],
    [
      i('Pierś z kurczaka (surowa)', 120),
      i('Ser feta', 40),
      i('Pomidor', 150),
      i('Ogórek', 150),
      i('Papryka czerwona', 80),
      i('Oliwa z oliwek', 10),
    ],
    'Kurczaka usmaż lub upiecz i pokrój. Warzywa pokrój w kostkę, dodaj fetę, kurczaka i oliwę z oregano.',
  ],
  [
    'Tosty z mozzarellą i pomidorem',
    [K, S],
    [i('Chleb żytni razowy', 100), i('Ser mozzarella light', 70), i('Pomidor', 150)],
    'Na pieczywie ułóż mozzarellę i pomidora, zapiekaj 6–8 min w 200°C. Posyp bazylią.',
  ],
  [
    'Omlet ze szpinakiem i serem',
    [K, S],
    [
      i('Jajko kurze (całe)', 150),
      i('Szpinak', 80),
      i('Ser żółty (gouda)', 20),
      i('Chleb żytni razowy', 60),
    ],
    'Jajka roztrzep, dodaj szpinak i starty ser. Smaż na małym ogniu pod przykryciem. Podawaj z pieczywem.',
  ],
  [
    'Wrap z hummusem i warzywami',
    [K, O],
    [
      i('Tortilla pszenna pełnoziarnista', 60),
      i('Hummus', 60),
      i('Papryka czerwona', 80),
      i('Ogórek', 80),
      i('Sałata', 30),
      i('Ser feta', 30),
    ],
    'Tortillę posmaruj hummusem, ułóż pokrojone warzywa i pokruszoną fetę, zawiń.',
  ],
  [
    'Serek wiejski z warzywami i pieczywem',
    [K, S],
    [i('Serek wiejski', 200), i('Pomidor', 100), i('Ogórek', 100), i('Chleb żytni razowy', 70)],
    'Warzywa pokrój, wymieszaj z serkiem, dopraw szczypiorkiem i pieprzem. Podawaj z pieczywem.',
  ],
  [
    'Bowl z łososiem, ryżem i awokado',
    [K, O],
    [
      i('Ryż biały (suchy)', 60),
      i('Łosoś (surowy)', 100),
      i('Ogórek', 100),
      i('Awokado', 50),
      i('Marchew', 60),
    ],
    'Ryż ugotuj. Łososia upiecz lub usmaż i pokrój w kostkę. Ułóż w misce z ryżem, ogórkiem, marchewką i awokado. Skrop sosem sojowym.',
  ],
  [
    'Pieczarki faszerowane z indykiem',
    [K],
    [
      i('Pieczarki', 250),
      i('Pierś z indyka (surowa)', 120),
      i('Cebula', 40),
      i('Ser mozzarella light', 30),
      i('Chleb żytni razowy', 50),
    ],
    'Trzonki pieczarek posiekaj i podsmaż z cebulą i mielonym indykiem. Nadziej kapelusze, posyp serem i piecz 15 min w 190°C.',
  ],
  // ——— Przekąski ———
  [
    'Jogurt grecki z owocami leśnymi',
    [P],
    [i('Jogurt grecki 2%', 150), i('Owoce leśne mrożone', 100), i('Miód', 10)],
    'Owoce rozmroź, wymieszaj z jogurtem i miodem.',
  ],
  [
    'Shake bananowo-białkowy',
    [P, S],
    [i('Odżywka białkowa (WPC)', 30), i('Mleko 2%', 250), i('Banan', 100)],
    'Wszystkie składniki zmiksuj blenderem.',
  ],
  [
    'Wafle ryżowe z masłem orzechowym i bananem',
    [P],
    [i('Wafle ryżowe', 30), i('Masło orzechowe', 20), i('Banan', 80)],
    'Wafle posmaruj masłem orzechowym i ułóż plasterki banana.',
  ],
  ['Jabłko z migdałami', [P], [i('Jabłko', 200), i('Migdały', 20)], 'Gotowe do zjedzenia – idealne na wynos.'],
  [
    'Skyr z orzechami',
    [P],
    [i('Skyr naturalny', 150), i('Orzechy włoskie', 15)],
    'Skyr posyp posiekanymi orzechami.',
  ],
  [
    'Warzywa z hummusem',
    [P],
    [i('Marchew', 100), i('Papryka czerwona', 100), i('Ogórek', 100), i('Hummus', 60)],
    'Warzywa pokrój w słupki i maczaj w hummusie.',
  ],
  [
    'Koktajl kefirowo-truskawkowy',
    [P, S],
    [i('Kefir 2%', 250), i('Truskawki', 150), i('Płatki owsiane', 20)],
    'Wszystkie składniki zmiksuj blenderem.',
  ],
  [
    'Twarożek z malinami i miodem',
    [P],
    [i('Twaróg półtłusty', 120), i('Maliny', 80), i('Miód', 10)],
    'Twaróg rozgnieć widelcem, dodaj maliny i miód.',
  ],
  [
    'Jabłko z masłem orzechowym',
    [P],
    [i('Jabłko', 180), i('Masło orzechowe', 20)],
    'Jabłko pokrój w ćwiartki i podawaj z masłem orzechowym.',
  ],
]

export const defaultRecipes: Recipe[] = list.map(([name, mealTypes, ingredients, instructions], n) => ({
  id: `recipe-${n + 1}`,
  name,
  mealTypes,
  ingredients,
  instructions,
}))
