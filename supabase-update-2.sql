-- Обновление для нескольких пользователей. Выполняется один раз, до загрузки новой версии приложения.

-- Разрешает хранить личный список занятий и ограничивает размер одной записи.
alter table public.docs drop constraint if exists docs_coll_check;
alter table public.docs add constraint docs_coll_check
  check (coll in ('days', 'weeks', 'tests', 'open', 'settings'));

alter table public.docs drop constraint if exists docs_size_check;
alter table public.docs add constraint docs_size_check
  check (char_length(id) <= 100 and pg_column_size(data) <= 102400);

-- Анонимным посетителям таблица вообще не нужна.
revoke all on public.docs from anon;

-- Сохраняет текущие занятия за теми, кто уже зарегистрирован.
insert into public.docs (user_id, coll, id, data)
select u.id, 'settings', 'main', $json$
{"goals": [
  {"id": "go", "field": "go", "name": "Go",
   "done": "Решённая задача, коммит, отправленное письмо или изучение определённой темы.",
   "tests": [["go_topics", "Тем освоено"], ["go_tasks", "Задач решено за месяц"]],
   "hint": "Раз в месяц. Тема считается освоенной, если получается пересказать её без конспекта и написать пример."},
  {"id": "calisthenics", "field": "fit", "name": "Калистеника",
   "done": "Одна полная тренировка.",
   "tests": [["pullups", "Подтягивания"], ["pushups", "Отжимания"]],
   "hint": "Максимум за один подход, раз в месяц. Показывает, растёт ли сила вместе с регулярностью."},
  {"id": "fencing", "field": "fence", "name": "Фехтование",
   "done": "Физическая подготовка или отработка уколов и ударов.",
   "tests": [["lunges", "Выпады за минуту"], ["hits", "Попаданий в мишень из 10"]],
   "hint": "Раз в месяц. Показывает, растёт ли техника вместе с регулярностью."},
  {"id": "stretching", "field": "stretch", "name": "Растяжка",
   "done": "Растяжка на разные зоны.",
   "tests": [["split_front", "Продольный шпагат, см до пола"], ["split_side", "Поперечный шпагат, см до пола"]],
   "hint": "Раз в месяц, после разминки. Здесь чем меньше число, тем лучше."}
]}
$json$::jsonb
from auth.users u
on conflict (user_id, coll, id) do nothing;
