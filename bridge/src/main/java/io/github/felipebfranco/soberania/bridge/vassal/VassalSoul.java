package io.github.felipebfranco.soberania.bridge.vassal;

import io.github.felipebfranco.soberania.bridge.SoberaniaBridge;
import io.github.manasmods.manascore.skill.api.ManasSkillInstance;
import io.github.manasmods.manascore.skill.api.SkillAPI;
import io.github.manasmods.manascore.skill.api.Skills;
import io.github.manasmods.tensura.storage.TensuraStorages;
import io.github.manasmods.tensura.storage.ep.IExistence;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import net.minecraft.ChatFormatting;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.world.entity.LivingEntity;

/**
 * The Tensura side of a vassal (ADR-007, M2): EP, magicules, aura and every learned skill with its mastery.
 * Captured from the monster at the oath, given to each citizen entity MineColonies creates for it, and read back
 * from the entity so whatever the citizen gains is kept when the entity is recreated.
 */
public final class VassalSoul {
    /** Marks an entity that already received its soul; MineColonies' fresh entities don't have it. */
    private static final String APPLIED = "soberania_soul";
    private static final Locale PT_BR = Locale.of("pt", "BR");
    private static final int SKILLS_SHOWN = 12;

    private VassalSoul() {}

    public static CompoundTag capture(LivingEntity entity) {
        CompoundTag soul = new CompoundTag();
        IExistence existence = TensuraStorages.getExistenceFrom(entity);
        if (existence != null) {
            soul.putDouble("ep", existence.getEP());
            soul.putDouble("magicule", existence.getMagicule());
            soul.putDouble("aura", existence.getAura());
        }
        ListTag skills = new ListTag();
        for (ManasSkillInstance skill : SkillAPI.getSkillsFrom(entity).getLearnedSkills()) {
            skills.add(skill.toNBT());
        }
        soul.put("skills", skills);
        return soul;
    }

    /** Gives a citizen entity its vassal's soul once. Returns false when the entity already had it. */
    public static boolean applyIfNew(LivingEntity entity, Vassal vassal) {
        CompoundTag data = entity.getPersistentData();
        if (data.getBoolean(APPLIED)) return false;
        CompoundTag soul = vassal.soul();

        IExistence existence = TensuraStorages.getExistenceFrom(entity);
        if (existence != null) {
            existence.setEP(soul.getDouble("ep"));
            existence.setMagicule(soul.getDouble("magicule"));
            existence.setAura(soul.getDouble("aura"));
            existence.setName(vassal.name());
            existence.setPermanentOwner(vassal.owner());
            existence.markDirty();
        }
        Skills skills = SkillAPI.getSkillsFrom(entity);
        for (CompoundTag tag : skillTags(soul)) {
            try {
                ManasSkillInstance skill = ManasSkillInstance.fromNBT(tag);
                if (skills.getSkill(skill.getSkillId()).isEmpty()) skills.learnSkill(skill);
            } catch (RuntimeException e) {
                SoberaniaBridge.LOG.warn("Skill do vassalo {} não pôde ser restaurada: {}", vassal.name(), tag, e);
            }
        }
        skills.markDirty();
        data.putBoolean(APPLIED, true);
        return true;
    }

    /** The vassal's sheet, shown when the Seal is used on it. */
    public static List<Component> describe(Vassal vassal) {
        CompoundTag soul = vassal.soul();
        double ep = soul.getDouble("ep");
        List<Component> lines = new ArrayList<>();
        lines.add(Component.literal("✦ " + vassal.name() + " — " + vassal.race() + ", classe " + VassalProfile.rankFor(ep).name())
            .withStyle(ChatFormatting.GOLD));
        lines.add(Component.literal("EP " + number(ep) + " · Magículas " + number(soul.getDouble("magicule"))
            + " · Aura " + number(soul.getDouble("aura"))).withStyle(ChatFormatting.GRAY));

        List<CompoundTag> tags = skillTags(soul);
        if (tags.isEmpty()) {
            lines.add(Component.literal("Sem skills.").withStyle(ChatFormatting.GRAY));
            return lines;
        }
        MutableComponent skillLine = Component.literal("Skills (" + tags.size() + "): ").withStyle(ChatFormatting.GRAY);
        for (int i = 0; i < Math.min(tags.size(), SKILLS_SHOWN); i++) {
            if (i > 0) skillLine.append(Component.literal(", ").withStyle(ChatFormatting.GRAY));
            skillLine.append(skillName(tags.get(i)));
        }
        if (tags.size() > SKILLS_SHOWN) {
            skillLine.append(Component.literal(" e mais " + (tags.size() - SKILLS_SHOWN)).withStyle(ChatFormatting.GRAY));
        }
        lines.add(skillLine);
        return lines;
    }

    private static Component skillName(CompoundTag tag) {
        try {
            return ManasSkillInstance.fromNBT(tag).getDisplayName().copy().withStyle(ChatFormatting.AQUA);
        } catch (RuntimeException e) {
            return Component.literal(tag.getString("skill")).withStyle(ChatFormatting.AQUA);
        }
    }

    private static List<CompoundTag> skillTags(CompoundTag soul) {
        ListTag list = soul.getList("skills", Tag.TAG_COMPOUND);
        List<CompoundTag> tags = new ArrayList<>(list.size());
        for (int i = 0; i < list.size(); i++) tags.add(list.getCompound(i));
        return tags;
    }

    private static String number(double value) {
        return String.format(PT_BR, "%,.0f", value);
    }
}
