package io.github.felipebfranco.soberania.bridge.vassal;

import com.minecolonies.api.colony.ICivilianData;
import java.util.UUID;
import org.jetbrains.annotations.Nullable;

/**
 * Implemented on MineColonies' CitizenData by mixin: links a citizen or visitor to its vassal record.
 * The id is saved in the citizen NBT, so it survives hiring (MineColonies copies the visitor NBT into the new citizen).
 */
public interface VassalHolder {
    @Nullable
    UUID soberania$getVassalId();

    void soberania$setVassalId(@Nullable UUID id);

    @Nullable
    static UUID vassalIdOf(@Nullable ICivilianData data) {
        return data instanceof VassalHolder holder ? holder.soberania$getVassalId() : null;
    }
}
