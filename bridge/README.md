# Soberania Bridge

Mod da ponte Tensura ↔ MineColonies do modpack *Soberania: Ferro e Mana* (NeoForge 21.1.264, Minecraft 1.21.1, Java 21).
Licença GPL-3.0-only. Decisão de arquitetura: ADR-007 ("cidadão com alma Tensura").

## O que faz (v0.2.0: etapas M0, M1 e M2)
- **Juramento de vassalagem**: o Selo de Vassalagem (`soberania:selo_de_vassalagem`, item registrado pelo KubeJS do pack)
  usado num súdito nomeado do jogador, dentro da colônia dele com Taverna construída, transforma o súdito num visitante da Taverna
  com nome, gênero, aptidões convertidas (classe por EP, raça e skills) e vida/dano extras. Qualquer raça jura; raças sem tabela
  usam multiplicadores neutros.
- **Aparência do próprio monstro**: no cliente, o cidadão-vassalo é desenhado por um "boneco" do mob original, criado a partir
  do NBT guardado no juramento, com pose, rotação, animação de andar e equipamento do cidadão.
- **Alma Tensura** (M2): EP, magículas, aura e todas as skills (com maestria) do monstro passam para o cidadão; as passivas valem
  no corpo dele, e o que ele ganhar como cidadão é lido de volta para o registro (sobrevive à recriação da entidade).
- **Ficha**: usar o Selo num cidadão-vassalo mostra nome, raça, classe, EP e skills no chat (o Selo não é gasto).
- **Trégua**: guardas não atacam súditos do Tensura cujo dono é membro (não hostil) da colônia
  (mixin em `AbstractEntityAIGuard.isAttackableTarget`).
- O vínculo cidadão ↔ vassalo fica no NBT do `CitizenData` (mixin) e sobrevive à contratação.

## Compilar
Os jars dos mods não vão para o git. Antes do primeiro build, copie para `libs/` (da pasta `mods` de uma instalação do pack):
MineColonies, Structurize, BlockUI, Domum Ornamentum, Tensura, SmartBrainLib, GeckoLib, Architectury e os jars de dentro de
`META-INF/jars/` do ManasCore (`unzip -j manascore-neoforge-*.jar 'META-INF/jars/*.jar' -d libs`).

```bash
./gradlew build      # gera build/libs/soberania_bridge-<versão>.jar
```

## Testar
- **Servidor**: copie o jar para um servidor de teste do pack e use uma sonda KubeJS que chame
  `VassalOath.swear(player, alvo, selo)` com um FakePlayer (modelo em `tools/sonda_vassalagem.js` do pack).
- **Cliente**: `run/mods` com os mods acima + KubeJS e Rhino, o script de startup do pack em `run/kubejs/startup_scripts`,
  e um mundo plano montado por script de cena (colônia com **Prefeitura**, sem ela o MineColonies não faz visitantes aparecerem).
  `./gradlew runServer` monta a cena; depois `./gradlew runClient` com `--quickPlaySingleplayer <mundo>`.
