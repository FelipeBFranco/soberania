// Soberania: Ferro e Mana — Juramento de vassalagem (protótipo da ponte, ADR-006).
//
// O jogador usa o Selo de Vassalagem num súdito que ele mesmo nomeou (Tensura),
// dentro de uma colônia dele que tenha Taverna (MineColonies). O súdito some e
// aparece na Taverna como visitante com o mesmo nome; contratado, vira cidadão.
// O NBT do monstro fica guardado no jogador para o mod da ponte poder devolvê-lo.
//
// Protótipo: usa classes internas do MineColonies (TavernBuildingModule). Ao
// trocar de versão do MineColonies ou do Tensura, testar este fluxo de novo.
//
// Atenção (KubeJS 7): event.cancel() encerra o callback na hora; por isso ele é
// sempre a última chamada de cada caminho.

const TensuraStorages = Java.loadClass('io.github.manasmods.tensura.storage.TensuraStorages')
const MinecoloniesAPI = Java.loadClass('com.minecolonies.api.IMinecoloniesAPI')
const TavernModule = Java.loadClass('com.minecolonies.core.colony.buildings.modules.TavernBuildingModule')
const CompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')

const SELO = 'soberania:selo_de_vassalagem'

function acharTaverna(colony) {
  const it = colony.getServerBuildingManager().getBuildings().values().iterator()
  while (it.hasNext()) {
    const b = it.next()
    if (b.hasModule(TavernModule)) return b
  }
  return null
}

// Devolve a mensagem de erro, ou null se o juramento aconteceu.
function jurar(player, target, item) {
  const existence = TensuraStorages.getExistenceFrom(target)
  const nome = existence ? existence.getName() : null
  const dono = existence ? existence.getPermanentOwner() : null
  if (!nome) return 'O Selo só funciona em criaturas que receberam um nome.'
  if (!dono || !dono.equals(player.getUUID())) return `${nome} não é seu súdito. Ninguém jura lealdade a um estranho.`

  const level = player.level
  const colony = MinecoloniesAPI.getInstance().getColonyManager().getColonyByPosFromWorld(level, target.blockPosition())
  if (!colony) return 'O juramento precisa ser feito dentro da sua colônia.'
  if (!colony.getPermissions().getOwner().equals(player.getUUID())) return `Esta colônia (${colony.getName()}) não é sua.`

  const taverna = acharTaverna(colony)
  if (!taverna) return 'Sua colônia ainda não tem Taverna. Construa uma para receber os vassalos.'
  const visitante = taverna.getModule(TavernModule).spawnVisitor()
  if (!visitante) return 'A Taverna está cheia. Contrate ou dispense algum visitante antes.'

  // O visitante assume o nome do súdito; custo simbólico de contratação.
  visitante.setName(nome)
  visitante.setRecruitCosts(Item.of('tensura:low_quality_magic_crystal', 1))
  visitante.markDirty(0)
  visitante.getEntity().ifPresent(e => e.setCustomName(Text.of(nome)))

  // Guarda o súdito original no jogador (para o mod da ponte poder devolvê-lo).
  const tipo = String(target.getEncodeId())
  const registro = player.persistentData.getList('soberania_vassalos', 10)
  const entrada = new CompoundTag()
  entrada.putString('nome', nome)
  entrada.putString('tipo', tipo)
  entrada.putString('nbt', target.saveWithoutId(new CompoundTag()).toString())
  entrada.putInt('colonia', colony.getID())
  entrada.putInt('visitante', visitante.getId())
  entrada.putLong('quando', level.getGameTime())
  registro.add(entrada)
  player.persistentData.put('soberania_vassalos', registro)

  // Cerimônia: partículas, som, o súdito parte, o selo é consumido.
  const dim = String(level.dimension().location())
  const x = target.getX(), y = target.getY() + 1, z = target.getZ()
  const srv = player.server
  srv.runCommandSilent(`execute in ${dim} run particle minecraft:soul_fire_flame ${x} ${y} ${z} 0.4 0.8 0.4 0.02 80 force`)
  srv.runCommandSilent(`execute in ${dim} run particle minecraft:end_rod ${x} ${y} ${z} 0.3 0.6 0.3 0.05 40 force`)
  srv.runCommandSilent(`execute in ${dim} run playsound minecraft:block.beacon.power_select player @a ${x} ${y} ${z} 1 1.2`)
  target.discard()
  if (!player.isCreative()) item.shrink(1)

  player.tell(Text.of(`${nome} jurou lealdade a você e partiu para a Taverna de ${colony.getName()}. Contrate-o lá para que vire cidadão.`).color('gold'))
  console.info(`[soberania] vassalagem: ${player.username} → ${nome} (${tipo}) na colônia ${colony.getID()}, visitante ${visitante.getId()}`)
  return null
}

ItemEvents.entityInteracted(SELO, event => {
  const player = event.player
  const target = event.target
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
