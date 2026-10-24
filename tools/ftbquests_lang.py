"""Gera config/ftbquests/quests/lang/pt_br.snbt a partir dos textos escritos
inline nos capítulos (title, subtitle, description, task.title, reward.title).

O FTB Quests 2101 ignora texto inline nos capítulos e lê tudo do arquivo de
idioma. Escrever inline continua mais confortável, então este script faz a
ponte. Rode depois de editar qualquer capítulo:

    python -I tools/ftbquests_lang.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "config" / "ftbquests" / "quests"
BOOK_TITLE = "&6&lSoberania: Ferro e Mana"


def read_string(text, key, start):
    m = re.compile(r"\n\s*" + key + r': "((?:[^"\\]|\\.)*)"').search(text, start)
    return m


def read_list(text, key, start):
    m = re.compile(r"\n\s*" + key + r": \[\n(.*?)\n\s*\]", re.S).search(text, start)
    if not m:
        return None, None
    items = re.findall(r'^\s*"((?:[^"\\]|\\.)*)"\s*$', m.group(1), re.M)
    return items, m


def blocks(text, open_pat):
    """Devolve (inicio, fim) de cada bloco { } que começa logo após open_pat."""
    for m in re.finditer(open_pat, text):
        depth, i = 0, m.end() - 1
        while i < len(text):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    yield m.end(), i
                    break
            i += 1


out = {}

groups = (ROOT / "chapter_groups.snbt").read_text(encoding="utf-8")
for s, e in blocks(groups, r"\n\s*\{"):
    body = groups[s:e]
    gid = re.search(r'id: "([0-9A-F]+)"', body)
    title = re.search(r'title: "((?:[^"\\]|\\.)*)"', body)
    if gid and title:
        out[f"chapter_group.{gid.group(1)}.title"] = title.group(1)

for chapter in sorted((ROOT / "chapters").glob("*.snbt")):
    text = chapter.read_text(encoding="utf-8")
    cid = re.search(r'\n\tid: "([0-9A-F]+)"', text).group(1)
    ctitle = re.search(r'\n\ttitle: "((?:[^"\\]|\\.)*)"', text)
    if ctitle:
        out[f"chapter.{cid}.title"] = ctitle.group(1)
    for s, e in blocks(text, r"\n\t\t\{"):
        q = text[s:e]
        qid = re.search(r'\n\t\t\tid: "([0-9A-F]+)"', q).group(1)
        t = re.search(r'\n\t\t\ttitle: "((?:[^"\\]|\\.)*)"', q)
        st = re.search(r'\n\t\t\tsubtitle: "((?:[^"\\]|\\.)*)"', q)
        desc, _ = read_list(q, "description", 0)
        if t:
            out[f"quest.{qid}.title"] = t.group(1)
        if st:
            out[f"quest.{qid}.quest_subtitle"] = st.group(1)
        if desc:
            out[f"quest.{qid}.quest_desc"] = desc
        for kind in ("tasks", "rewards"):
            lm = re.search(r"\n\t\t\t" + kind + r": \[", q)
            if not lm:
                continue
            for ts, te in blocks(q[lm.end():], r"\{"):
                tb = q[lm.end() + ts: lm.end() + te]
                tid = re.search(r'id: "([0-9A-F]+)"', tb)
                tt = re.search(r'\n\s*title: "((?:[^"\\]|\\.)*)"', tb)
                if tid and tt:
                    out[f"{kind[:-1]}.{tid.group(1)}.title"] = tt.group(1)

for table in sorted((ROOT / "reward_tables").glob("*.snbt")) if (ROOT / "reward_tables").exists() else []:
    text = table.read_text(encoding="utf-8")
    tid = re.search(r'\n\tid: "([0-9A-F]+)"', text).group(1)
    tt = re.search(r'\n\ttitle: "((?:[^"\\]|\\.)*)"', text)
    if tt:
        out[f"reward_table.{tid}.title"] = tt.group(1)
    for rm in re.finditer(r'\{ id: "([0-9A-F]+)"[^}]*?title: "((?:[^"\\]|\\.)*)"', text):
        out[f"reward.{rm.group(1)}.title"] = rm.group(2)

lines = ["{", f'\tfile.0000000000000001.title: "{BOOK_TITLE}"']
for key in sorted(out):
    val = out[key]
    if isinstance(val, list):
        lines.append(f"\t{key}: [")
        lines += [f'\t\t"{v}"' for v in val]
        lines.append("\t]")
    else:
        lines.append(f'\t{key}: "{val}"')
lines.append("}")
dest = ROOT / "lang" / "pt_br.snbt"
dest.parent.mkdir(exist_ok=True)
dest.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"{len(out)} chaves -> {dest}")
