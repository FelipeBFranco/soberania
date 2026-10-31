package io.github.felipebfranco.soberania.bridge.vassal;

import java.util.UUID;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;

/**
 * A sworn vassal: what the monster was (type and full NBT, used for its appearance and to release it later),
 * what it became (rank, extra health and damage) and its Tensura soul (EP, magicules, aura, skills; see VassalSoul).
 */
public record Vassal(
    UUID id,
    UUID owner,
    int colonyId,
    ResourceLocation dimension,
    String name,
    String race,
    String rank,
    double ep,
    int extraHealth,
    int extraDamage,
    ResourceLocation entityType,
    CompoundTag entityNbt,
    long swornAt,
    CompoundTag soul
) {
    public Vassal withSoul(CompoundTag newSoul) {
        return new Vassal(id, owner, colonyId, dimension, name, race, rank, ep, extraHealth, extraDamage, entityType, entityNbt, swornAt, newSoul);
    }

    public CompoundTag save() {
        CompoundTag tag = new CompoundTag();
        tag.putUUID("id", id);
        tag.putUUID("owner", owner);
        tag.putInt("colony", colonyId);
        tag.putString("dimension", dimension.toString());
        tag.putString("name", name);
        tag.putString("race", race);
        tag.putString("rank", rank);
        tag.putDouble("ep", ep);
        tag.putInt("health", extraHealth);
        tag.putInt("damage", extraDamage);
        tag.putString("type", entityType.toString());
        tag.put("nbt", entityNbt);
        tag.putLong("sworn", swornAt);
        tag.put("soul", soul);
        return tag;
    }

    public static Vassal load(CompoundTag tag) {
        return new Vassal(
            tag.getUUID("id"),
            tag.getUUID("owner"),
            tag.getInt("colony"),
            ResourceLocation.parse(tag.getString("dimension")),
            tag.getString("name"),
            tag.getString("race"),
            tag.getString("rank"),
            tag.getDouble("ep"),
            tag.getInt("health"),
            tag.getInt("damage"),
            ResourceLocation.parse(tag.getString("type")),
            tag.getCompound("nbt"),
            tag.getLong("sworn"),
            tag.getCompound("soul"));
    }
}
