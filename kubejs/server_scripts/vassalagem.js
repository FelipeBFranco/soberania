// Soberania: Ferro e Mana — Juramento de vassalagem (protótipo da ponte, ADR-006).
//
// O jogador usa o Selo de Vassalagem num súdito que ele mesmo nomeou (Tensura),
// dentro de uma colônia dele que tenha Taverna (MineColonies). O súdito some e
// aparece na Taverna como visitante com o mesmo nome, a própria aparência
// (goblin/hobgoblin) e aptidões convertidas da raça, do EP e das skills que tinha.
// Contratado, vira cidadão com tudo isso. O NBT do monstro fica guardado para o
// mod da ponte poder devolvê-lo.
//
// v1: só goblin e hobgoblin juram (as outras raças usam modelo GeckoLib e
// precisam do mod para manter a aparência). Vida, dano e escala não persistem
// na entidade do MineColonies: são reaplicados periodicamente (ver fim do arquivo).
//
// Atenção (KubeJS 7 / Rhino):
// - event.cancel() encerra o callback na hora; por isso ele é sempre a última
//   chamada de cada caminho.
// - Dentro de funções, laços e blocos use `let`, nunca `const`: um `const` em bloco
//   que roda mais de uma vez dá "redeclaration of var". `const` só no topo do arquivo.
// - Alguns nomes do jogo não existem para o Rhino: getUUID() → .uuid,
//   level.getGameTime() → level.getLevelData().getGameTime(), level.dimension() →
//   level.dimension (propriedade, já é o id). UUIDs são comparados como texto.
// Todo script novo passa pela sonda no servidor de teste antes de ir para o jogo.

const TensuraStorages = Java.loadClass('io.github.manasmods.tensura.storage.TensuraStorages')
const SkillAPI = Java.loadClass('io.github.manasmods.manascore.skill.api.SkillAPI')
const MinecoloniesAPI = Java.loadClass('com.minecolonies.api.IMinecoloniesAPI')
const TavernModule = Java.loadClass('com.minecolonies.core.colony.buildings.modules.TavernBuildingModule')
const Skill = Java.loadClass('com.minecolonies.api.entity.citizen.Skill')
const CompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')
const AttributeModifier = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
const Operation = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation')
const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
const BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')

const SELO = 'soberania:selo_de_vassalagem'
const REGISTRO = 'soberania_vassalos' // em server.persistentData: lista de {colonia, nome, raca, classe, ep, vida, dano, escala}

// ---------------------------------------------------------------------------
// Tabela de conversão v1 (ver KB: estudo-vassalo-aparencia-e-atributos)
// ---------------------------------------------------------------------------
const APTIDOES = ['Athletics', 'Dexterity', 'Strength', 'Agility', 'Stamina', 'Mana', 'Adaptability', 'Focus', 'Creativity', 'Knowledge', 'Intelligence']

// classe por EP → nível base das aptidões, vida e dano extras
const CLASSES = [
  { nome: 'SS', minEP: 800000, nivel: 85, vida: 60, dano: 10 },
  { nome: 'S', minEP: 400000, nivel: 70, vida: 40, dano: 8 },
  { nome: 'A+', minEP: 100000, nivel: 55, vida: 30, dano: 6 },
  { nome: 'A', minEP: 10000, nivel: 40, vida: 20, dano: 4 },
  { nome: 'B', minEP: 6000, nivel: 30, vida: 12, dano: 3 },
  { nome: 'C', minEP: 3000, nivel: 22, vida: 8, dano: 2 },
  { nome: 'D', minEP: 1000, nivel: 14, vida: 4, dano: 1 },
  { nome: 'E', minEP: 0, nivel: 8, vida: 0, dano: 0 }
]

// raça → multiplicadores (Ath Dex Str Agi Sta Man Ada Foc Cre Kno Int), escala, sufixo de textura
const RACAS = {
  goblin: { mult: [1.1, 1.3, 0.8, 1.3, 1.0, 0.6, 1.1, 0.9, 1.0, 0.7, 0.7], escala: 0.7, textura: '_vgob_' },
  hobgoblin: { mult: [1.2, 1.3, 1.0, 1.3, 1.1, 0.7, 1.2, 1.0, 1.0, 0.9, 0.9], escala: 0.94, textura: '_vgob_' }
}

// skills do Tensura que o mob tinha → bônus de aptidão (nomes do MineColonies)
const BONUS_SKILL = {
  'tensura:strength': { Strength: 8 }, 'tensura:starved': { Strength: 8 }, 'tensura:corrosion': { Strength: 8 },
  'tensura:self_regeneration': { Stamina: 5 }, 'tensura:scale_armor': { Stamina: 5 },
  'tensura:magic_resistance': { Mana: 5 }, 'tensura:magic_sense': { Focus: 5, Knowledge: 3 },
  'tensura:thought_communication': { Intelligence: 5, Adaptability: 3 }, 'tensura:telepathy': { Intelligence: 5, Adaptability: 3 },
  'tensura:earth_manipulation': { Strength: 3, Creativity: 5 }, 'tensura:earth_transform': { Strength: 3, Creativity: 5 },
  'tensura:water_manipulation': { Focus: 5 }, 'tensura:flame_manipulation': { Creativity: 5, Athletics: 3 },
  'tensura:flame_transform': { Creativity: 5, Athletics: 3 }, 'tensura:wind_manipulation': { Agility: 5 }
}

// Skills que toda criatura da raça já nasce com (o goblin nasce com 21 resistências).
// Só as skills além dessas contam como bônus; calculado uma vez por raça com um
// molde que entra no mundo por um instante (fora do mundo ele ainda não tem skills).
const SKILLS_INATAS = {}

function idsDasSkills(entity) {
  let ids = []
  let it = SkillAPI.getSkillsFrom(entity).getLearnedSkills().iterator()
  while (it.hasNext()) ids.push(String(it.next().getSkillId()))
  return ids
}

function skillsInatas(target, raca) {
  if (SKILLS_INATAS[raca]) return SKILLS_INATAS[raca]
  let inatas = {}
  let molde = null
  try {
    molde = target.level.createEntity(String(target.getEncodeId()))
    molde.setPos(target.getX(), target.getY(), target.getZ())
    target.level.addFreshEntity(molde)
    if (raca === 'hobgoblin') molde.evolve()
    idsDasSkills(molde).forEach(id => { inatas[id] = true })
    SKILLS_INATAS[raca] = inatas
  } catch (e) {
    console.warn(`[soberania] não li as skills inatas de ${raca}: ${e}`)
  }
  if (molde) molde.discard()
  return inatas
}

function classePorEP(ep) {
  for (let c of CLASSES) if (ep >= c.minEP) return c
  return CLASSES[CLASSES.length - 1]
}

function racaDe(target) {
  let tipo = String(target.getEncodeId())
  if (tipo === 'tensura:goblin') return target.isHobgoblin() ? 'hobgoblin' : 'goblin'
  return null
}

function peleDe(target) {
  try {
    let s = String(target.getSkin())
    if (s === 'LIGHT') return 'light'
    if (s === 'DARK') return 'dark'
  } catch (e) {}
  return 'mid'
}

function ehFemea(target) {
  try { return String(target.getGender()) === 'FEMALE' } catch (e) { return Math.random() < 0.5 }
}

// Calcula o perfil: {aptidoes: {Nome: nivel}, classe, vida, dano}
function converter(target, raca, ep, inatas) {
  let classe = classePorEP(ep)
  let r = RACAS[raca]
  let aptidoes = {}
  APTIDOES.forEach((nome, i) => {
    aptidoes[nome] = Math.round(classe.nivel * r.mult[i]) + Math.floor(Math.random() * 3)
  })
  let vidaExtra = classe.vida
  let skills = []
  try {
    idsDasSkills(target).forEach(id => {
      if (inatas[id]) return
      skills.push(id)
      let b = BONUS_SKILL[id]
      if (b) for (let k in b) aptidoes[k] += b[k]
      if (id.endsWith('_resistance')) vidaExtra += 2
      if (id.endsWith('_nullification')) vidaExtra += 4
    })
  } catch (e) {
    console.warn(`[soberania] não li as skills do súdito: ${e}`)
  }
  vidaExtra = Math.min(vidaExtra, classe.vida + 20)
  for (let k in aptidoes) aptidoes[k] = Math.max(1, Math.min(99, aptidoes[k]))
  return { aptidoes: aptidoes, classe: classe, vida: vidaExtra, dano: classe.dano, escala: r.escala, skills: skills }
}

// Devolve a Taverna de nível mais alto da colônia (ou null).
function acharTaverna(colony) {
  let melhor = null
  let it = colony.getServerBuildingManager().getBuildings().values().iterator()
  while (it.hasNext()) {
    let b = it.next()
    if (!b.hasModule(TavernModule)) continue
    if (!melhor || b.getBuildingLevel() > melhor.getBuildingLevel()) melhor = b
  }
  return melhor
}

function registroDoServidor(server) {
  return server.persistentData.getList(REGISTRO, 10)
}

// Devolve a mensagem de erro, ou null se o juramento aconteceu.
function jurar(player, target, item) {
  let existence = TensuraStorages.getExistenceFrom(target)
  let nome = existence ? existence.getName() : null
  let dono = existence ? existence.getPermanentOwner() : null
  if (!nome) return 'O Selo só funciona em criaturas que receberam um nome.'
  nome = String(nome)
  let meuId = String(player.uuid)
  if (!dono || String(dono) !== meuId) return `${nome} não é seu súdito. Ninguém jura lealdade a um estranho.`

  let raca = racaDe(target)
  if (!raca) return `${nome} ainda não sabe jurar vassalagem. Por enquanto, só goblins e hobgoblins juram.`

  let level = player.level
  let colony = MinecoloniesAPI.getInstance().getColonyManager().getColonyByPosFromWorld(level, target.blockPosition())
  if (!colony) return 'O juramento precisa ser feito dentro da sua colônia.'
  if (String(colony.getPermissions().getOwner()) !== meuId) return `Esta colônia (${colony.getName()}) não é sua.`

  let taverna = acharTaverna(colony)
  if (!taverna) return 'Sua colônia ainda não tem Taverna. Construa uma para receber os vassalos.'
  if (taverna.getBuildingLevel() < 1) return 'A Taverna ainda não foi construída. Termine a obra para receber os vassalos.'

  // Lê tudo do súdito ANTES de removê-lo.
  let tipo = String(target.getEncodeId())
  let ep = existence.getEP()
  let perfil = converter(target, raca, ep, skillsInatas(target, raca))
  let femea = ehFemea(target)
  let sufixo = RACAS[raca].textura + peleDe(target)
  let nbtOriginal = target.saveWithoutId(new CompoundTag()).toString()

  let visitante = taverna.getModule(TavernModule).spawnVisitor()
  if (!visitante) return 'A Taverna não conseguiu receber o vassalo agora. Tente de novo em instantes.'

  // Identidade, aparência e aptidões (passam para o cidadão na contratação).
  visitante.setGender(femea)
  visitante.setName(nome)
  visitante.setSuffix(sufixo)
  let h = visitante.getCitizenSkillHandler()
  for (let k in perfil.aptidoes) {
    let s = Skill.valueOf(k)
    h.incrementLevel(s, perfil.aptidoes[k] - h.getLevel(s))
  }
  visitante.setRecruitCosts(Item.of('tensura:low_quality_magic_crystal', 1))
  visitante.markDirty(0)
  visitante.getEntity().ifPresent(e => {
    e.setCustomName(Text.of(nome))
    aplicarCorpo(e, perfil)
  })

  // Registro do servidor: usado para reaplicar vida/dano/escala no cidadão (o ID muda na contratação).
  let registro = registroDoServidor(player.server)
  let entrada = new CompoundTag()
  entrada.putInt('colonia', colony.getID())
  entrada.putString('nome', nome)
  entrada.putString('raca', raca)
  entrada.putString('classe', perfil.classe.nome)
  entrada.putDouble('ep', ep)
  entrada.putInt('vida', perfil.vida)
  entrada.putInt('dano', perfil.dano)
  entrada.putDouble('escala', perfil.escala)
  entrada.putString('tipo', tipo)
  entrada.putString('nbt', nbtOriginal)
  entrada.putString('dono', meuId)
  entrada.putLong('quando', level.getLevelData().getGameTime())
  registro.add(entrada)
  player.server.persistentData.put(REGISTRO, registro)

  // Cerimônia.
  let dim = String(level.dimension)
  let x = target.getX(), y = target.getY() + 1, z = target.getZ()
  let srv = player.server
  srv.runCommandSilent(`execute in ${dim} run particle minecraft:soul_fire_flame ${x} ${y} ${z} 0.4 0.8 0.4 0.02 80 force`)
  srv.runCommandSilent(`execute in ${dim} run particle minecraft:end_rod ${x} ${y} ${z} 0.3 0.6 0.3 0.05 40 force`)
  srv.runCommandSilent(`execute in ${dim} run playsound minecraft:block.beacon.power_select player @a ${x} ${y} ${z} 1 1.2`)
  target.discard()
  if (!player.isCreative()) item.shrink(1)

  let resumo = APTIDOES.filter(k => perfil.aptidoes[k] >= perfil.classe.nivel * 1.2).slice(0, 3).map(traduzirAptidao).join(', ')
  player.tell(Text.of(`${nome} (${raca}, classe ${perfil.classe.nome}) jurou lealdade e partiu para a Taverna de ${colony.getName()}.`).color('gold'))
  if (resumo) player.tell(Text.of(`Destaques: ${resumo}. Contrate na Taverna para que vire cidadão.`).color('gray'))
  console.info(`[soberania] vassalagem: ${player.username} → ${nome} (${raca}, EP ${Math.round(ep)}, ${perfil.classe.nome}) colônia ${colony.getID()}; skills ${perfil.skills.join(',')}`)
  return null
}

function traduzirAptidao(k) {
  return ({ Athletics: 'Atletismo', Dexterity: 'Destreza', Strength: 'Força', Agility: 'Agilidade', Stamina: 'Vigor', Mana: 'Mana',
    Adaptability: 'Adaptabilidade', Focus: 'Foco', Creativity: 'Criatividade', Knowledge: 'Conhecimento', Intelligence: 'Inteligência' })[k] || k
}

// Vida, dano e escala ficam na entidade; reaplicados de forma idempotente.
function aplicarCorpo(entity, perfil) {
  let mods = [
    ['minecraft:generic.max_health', 'soberania:vassalo_vida', perfil.vida, Operation.ADD_VALUE],
    ['minecraft:generic.attack_damage', 'soberania:vassalo_dano', perfil.dano, Operation.ADD_VALUE],
    ['minecraft:generic.scale', 'soberania:vassalo_escala', perfil.escala - 1.0, Operation.ADD_MULTIPLIED_TOTAL]
  ]
  for (let i = 0; i < mods.length; i++) {
    let attrId = mods[i][0], modId = mods[i][1], valor = mods[i][2], op = mods[i][3]
    if (!valor) continue
    let holder = BuiltInRegistries.ATTRIBUTE.getHolder(ResourceLocation.parse(attrId))
    if (!holder.isPresent()) continue
    let inst = entity.getAttribute(holder.get())
    if (!inst) continue
    let id = ResourceLocation.parse(modId)
    if (inst.hasModifier(id)) continue
    inst.addPermanentModifier(new AttributeModifier(id, valor, op))
    if (attrId.endsWith('max_health')) entity.setHealth(entity.getMaxHealth())
  }
}

ItemEvents.entityInteracted(SELO, event => {
  let player = event.player
  let target = event.target
  if (player.level.isClientSide()) return
  if (!target || !target.isLiving()) return

  let erro
  try {
    erro = jurar(player, target, event.item)
  } catch (e) {
    console.error(`[soberania] vassalagem falhou: ${e}`)
    erro = 'Algo deu errado no juramento (veja o log do servidor). O súdito continua com você.'
  }
  if (erro) player.tell(Text.of(erro).color('gold'))
  event.cancel()
})

// Reaplica vida, dano e escala nos vassalos (achados por colônia + nome) de uma vez.
function reaplicarVassalos(server) {
  let registro = server.persistentData.getList(REGISTRO, 10)
  if (registro.isEmpty()) return
  let manager = MinecoloniesAPI.getInstance().getColonyManager()
  for (let i = 0; i < registro.size(); i++) {
    let r = registro.getCompound(i)
    let colony
    try {
      colony = manager.getColonyByWorld(r.getInt('colonia'), server.overworld())
    } catch (e) { colony = null }
    if (!colony) continue
    let perfil = { vida: r.getInt('vida'), dano: r.getInt('dano'), escala: r.getDouble('escala') }
    let nome = String(r.getString('nome'))
    let it = colony.getCitizenManager().getCitizens().iterator()
    while (it.hasNext()) {
      let c = it.next()
      if (String(c.getName()) !== nome) continue
      c.getEntity().ifPresent(e => aplicarCorpo(e, perfil))
    }
    let vit = colony.getVisitorManager().getCivilianDataMap().values().iterator()
    while (vit.hasNext()) {
      let v = vit.next()
      if (String(v.getName()) !== nome) continue
      v.getEntity().ifPresent(e => aplicarCorpo(e, perfil))
    }
  }
}

// A cada 10 s.
ServerEvents.tick(event => {
  if (event.server.getTickCount() % 200 !== 0) return
  try {
    reaplicarVassalos(event.server)
  } catch (e) {
    console.error(`[soberania] reaplicar vassalos falhou: ${e}`)
  }
})
