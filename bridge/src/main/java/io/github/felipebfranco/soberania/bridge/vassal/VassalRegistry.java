package io.github.felipebfranco.soberania.bridge.vassal;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.saveddata.SavedData;
import org.jetbrains.annotations.Nullable;

/** All vassals of the world, saved with the overworld data. */
public final class VassalRegistry extends SavedData {
    private static final String NAME = "soberania_vassals";
    private static final Factory<VassalRegistry> FACTORY = new Factory<>(VassalRegistry::new, VassalRegistry::load, null);

    private final Map<UUID, Vassal> vassals = new LinkedHashMap<>();

    public static VassalRegistry get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(FACTORY, NAME);
    }

    @Nullable
    public Vassal get(@Nullable UUID id) {
        return id == null ? null : vassals.get(id);
    }

    public Collection<Vassal> all() {
        return Collections.unmodifiableCollection(vassals.values());
    }

    public void add(Vassal vassal) {
        vassals.put(vassal.id(), vassal);
        setDirty();
    }

    /** Keeps what a citizen gained (EP, skills) in the record; only marks the data dirty when something changed. */
    public void updateSoul(UUID id, CompoundTag soul) {
        Vassal current = vassals.get(id);
        if (current == null || current.soul().equals(soul)) return;
        vassals.put(id, current.withSoul(soul));
        setDirty();
    }

    @Override
    public CompoundTag save(CompoundTag tag, HolderLookup.Provider provider) {
        ListTag list = new ListTag();
        vassals.values().forEach(v -> list.add(v.save()));
        tag.put("vassals", list);
        return tag;
    }

    private static VassalRegistry load(CompoundTag tag, HolderLookup.Provider provider) {
        VassalRegistry registry = new VassalRegistry();
        ListTag list = tag.getList("vassals", Tag.TAG_COMPOUND);
        for (int i = 0; i < list.size(); i++) {
            Vassal v = Vassal.load(list.getCompound(i));
            registry.vassals.put(v.id(), v);
        }
        return registry;
    }
}
