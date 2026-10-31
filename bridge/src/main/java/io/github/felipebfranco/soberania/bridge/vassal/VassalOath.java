package io.github.felipebfranco.soberania.bridge.vassal;

import com.minecolonies.api.IMinecoloniesAPI;
import com.minecolonies.api.colony.IColony;
import com.minecolonies.api.colony.IVisitorData;
import com.minecolonies.api.colony.buildings.IBuilding;
import com.minecolonies.api.entity.citizen.AbstractEntityCitizen;
import com.minecolonies.api.entity.citizen.Skill;
import com.minecolonies.api.entity.citizen.citizenhandlers.ICitizenSkillHandler;
import com.minecolonies.core.colony.buildings.modules.TavernBuildingModule;
import io.github.felipebfranco.soberania.bridge.SoberaniaBridge;
import io.github.felipebfranco.soberania.bridge.network.VassalAppearancePayload;
import io.github.manasmods.tensura.entity.monster.GoblinEntity;
import io.github.manasmods.tensura.entity.variant.GoblinVariant;
import io.github.manasmods.tensura.storage.TensuraStorages;
import io.github.manasmods.tensura.storage.ep.IExistence;
import java.util.Map;
import java.util.UUID;
import net.minecraft.ChatFormatting;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import org.jetbrains.annotations.Nullable;

/**
 * The Oath of Vassalage: a named subordinate the player owns, inside the player's colony with a built Tavern,
 * leaves the world and arrives at the Tavern as a visitor with its own name, appearance and converted aptitudes.
 */
public final class VassalOath {
    public static final ResourceLocation SEAL = ResourceLocation.fromNamespaceAndPath("soberania", "selo_de_vassalagem");
    private static final ResourceLocation RECRUIT_COST = ResourceLocation.fromNamespaceAndPath("tensura", "low_quality_magic_crystal");

    private VassalOath() {}

    public static boolean isSeal(ItemStack stack) {
        return BuiltInRegistries.ITEM.getKey(stack.getItem()).equals(SEAL);
    }

    /** Returns the message explaining why the oath failed, or null when the vassal was sworn. */
    @Nullable
    public static Component swear(ServerPlayer player, LivingEntity target, ItemStack seal) {
        if (target instanceof AbstractEntityCitizen citizen) {
            return showSoul(player, citizen);
        }
        if (target instanceof Player) {
            return Component.literal("O Selo só funciona em súditos do Tensura.");
        }
        IExistence existence = TensuraStorages.getExistenceFrom(target);
        String name = existence == null ? null : existence.getName();
        if (name == null || name.isBlank()) {
            return Component.literal("O Selo só funciona em criaturas que receberam um nome.");
        }
        UUID owner = existence.getPermanentOwner();
        if (!player.getUUID().equals(owner)) {
            return Component.literal(name + " não é seu súdito. Ninguém jura lealdade a um estranho.");
        }

        ServerLevel level = player.serverLevel();
        IColony colony = IMinecoloniesAPI.getInstance().getColonyManager().getColonyByPosFromWorld(level, target.blockPosition());
        if (colony == null) {
            return Component.literal("O juramento precisa ser feito dentro da sua colônia.");
        }
        if (!player.getUUID().equals(colony.getPermissions().getOwner())) {
            return Component.literal("Esta colônia (" + colony.getName() + ") não é sua.");
        }
        IBuilding tavern = findTavern(colony);
        if (tavern == null) {
            return Component.literal("Sua colônia ainda não tem Taverna. Construa uma para receber os vassalos.");
        }
        if (tavern.getBuildingLevel() < 1) {
            return Component.literal("A Taverna ainda não foi construída. Termine a obra para receber os vassalos.");
        }

        // Read everything from the monster BEFORE removing it.
        String race = raceOf(target);
        double ep = existence.getEP();
        VassalProfile profile = VassalProfile.of(target, race, ep);
        CompoundTag nbt = target.saveWithoutId(new CompoundTag());
        CompoundTag soul = VassalSoul.capture(target);
        ResourceLocation type = BuiltInRegistries.ENTITY_TYPE.getKey(target.getType());

        IVisitorData visitor = tavern.getModule(TavernBuildingModule.class).spawnVisitor();
        if (visitor == null) {
            return Component.literal("A Taverna não conseguiu receber o vassalo agora. Tente de novo em instantes.");
        }

        Vassal vassal = new Vassal(UUID.randomUUID(), player.getUUID(), colony.getID(), colony.getDimension().location(), name, race,
            profile.rank.name(), ep, profile.extraHealth, profile.rank.damage(), type, nbt, level.getGameTime(), soul);
        VassalRegistry.get(player.server).add(vassal);

        visitor.setGender(isFemale(target));
        visitor.setName(name);
        if (target instanceof GoblinEntity goblin) {
            // Citizen texture kept as a fallback for when the stand-in cannot be drawn (ADR-007).
            visitor.setSuffix("_vgob_" + skinSuffix(goblin));
        }
        ICitizenSkillHandler skills = visitor.getCitizenSkillHandler();
        for (Map.Entry<Skill, Integer> e : profile.aptitudes.entrySet()) {
            skills.incrementLevel(e.getKey(), e.getValue() - skills.getLevel(e.getKey()));
        }
        visitor.setRecruitCosts(new ItemStack(BuiltInRegistries.ITEM.get(RECRUIT_COST)));
        ((VassalHolder) visitor).soberania$setVassalId(vassal.id());
        visitor.markDirty(0);
        // spawnVisitor() already created the entity with a random look; copy ours onto it.
        visitor.getEntity().ifPresent(entity -> {
            visitor.initEntityValues();
            VassalBody.apply(entity, vassal);
            VassalSoul.applyIfNew(entity, vassal);
            VassalAppearancePayload.sendToTracking(entity, vassal);
        });

        ceremony(level, target);
        target.discard();
        if (!player.isCreative()) seal.shrink(1);

        player.sendSystemMessage(Component.literal(name + " (" + race + ", classe " + profile.rank.name()
            + ") jurou lealdade e partiu para a Taverna de " + colony.getName() + ".").withStyle(ChatFormatting.GOLD));
        SoberaniaBridge.LOG.info("vassalagem: {} → {} ({}, EP {}, {}) colônia {}; skills {}", player.getGameProfile().getName(), name, race,
            Math.round(ep), profile.rank.name(), colony.getID(), profile.learnedSkills);
        return null;
    }

    /** The Seal on a citizen reveals its oath instead of swearing (and is not used up). */
    @Nullable
    private static Component showSoul(ServerPlayer player, AbstractEntityCitizen citizen) {
        Vassal vassal = VassalRegistry.get(player.server).get(VassalHolder.vassalIdOf(citizen.getCivilianData()));
        if (vassal == null) return Component.literal("Este cidadão não jurou vassalagem.");
        VassalSoul.describe(vassal).forEach(player::sendSystemMessage);
        return null;
    }

    @Nullable
    private static IBuilding findTavern(IColony colony) {
        IBuilding best = null;
        for (IBuilding b : colony.getServerBuildingManager().getBuildings().values()) {
            if (!b.hasModule(TavernBuildingModule.class)) continue;
            if (best == null || b.getBuildingLevel() > best.getBuildingLevel()) best = b;
        }
        return best;
    }

    static String raceOf(LivingEntity target) {
        if (target instanceof GoblinEntity goblin) return goblin.isHobgoblin() ? "hobgoblin" : "goblin";
        return BuiltInRegistries.ENTITY_TYPE.getKey(target.getType()).getPath();
    }

    private static boolean isFemale(LivingEntity target) {
        if (target instanceof GoblinEntity goblin) return goblin.getGender() == GoblinVariant.Gender.FEMALE;
        return target.getRandom().nextBoolean();
    }

    private static String skinSuffix(GoblinEntity goblin) {
        return switch (goblin.getSkin().name()) {
            case "LIGHT" -> "light";
            case "DARK" -> "dark";
            default -> "mid";
        };
    }

    private static void ceremony(ServerLevel level, LivingEntity target) {
        double x = target.getX(), y = target.getY() + 1, z = target.getZ();
        level.sendParticles(ParticleTypes.SOUL_FIRE_FLAME, x, y, z, 80, 0.4, 0.8, 0.4, 0.02);
        level.sendParticles(ParticleTypes.END_ROD, x, y, z, 40, 0.3, 0.6, 0.3, 0.05);
        level.playSound(null, x, y, z, SoundEvents.BEACON_POWER_SELECT, SoundSource.PLAYERS, 1f, 1.2f);
    }
}
