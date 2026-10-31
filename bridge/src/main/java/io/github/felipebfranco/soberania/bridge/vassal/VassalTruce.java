package io.github.felipebfranco.soberania.bridge.vassal;

import com.minecolonies.api.colony.IColony;
import com.minecolonies.api.colony.permissions.IPermissions;
import com.minecolonies.api.colony.permissions.Rank;
import com.minecolonies.api.entity.citizen.AbstractEntityCitizen;
import io.github.manasmods.tensura.storage.TensuraStorages;
import io.github.manasmods.tensura.storage.ep.IExistence;
import java.util.UUID;
import net.minecraft.world.entity.LivingEntity;

/** Guards leave alone the Tensura subordinates of the colony's own people (ADR-006/007). */
public final class VassalTruce {
    private VassalTruce() {}

    public static boolean isProtected(AbstractEntityCitizen guard, LivingEntity target) {
        IExistence existence = TensuraStorages.getExistenceFrom(target);
        UUID owner = existence == null ? null : existence.getPermanentOwner();
        if (owner == null) return false;
        IColony colony = guard.getCitizenColonyHandler().getColonyOrRegister();
        if (colony == null) return false;
        IPermissions permissions = colony.getPermissions();
        if (!permissions.getPlayers().containsKey(owner)) return false;
        Rank rank = permissions.getRank(owner);
        return rank != null && !rank.isHostile();
    }
}
