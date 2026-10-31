package io.github.felipebfranco.soberania.bridge.client;

import io.github.felipebfranco.soberania.bridge.SoberaniaBridge;
import io.github.felipebfranco.soberania.bridge.mixin.WalkAnimationStateAccessor;
import it.unimi.dsi.fastutil.ints.Int2ObjectMap;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import it.unimi.dsi.fastutil.ints.IntOpenHashSet;
import it.unimi.dsi.fastutil.ints.IntSet;
import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.LivingEntity;
import org.jetbrains.annotations.Nullable;

/**
 * Client side of the vassal appearance: for each citizen entity that is a vassal, a stand-in of the original monster
 * (never added to the world) that is drawn in the citizen's place with the citizen's pose and movement.
 */
public final class ClientVassals {
    private record Appearance(ResourceLocation type, CompoundTag nbt) {}

    private static final Int2ObjectMap<Appearance> APPEARANCES = new Int2ObjectOpenHashMap<>();
    private static final Int2ObjectMap<LivingEntity> STAND_INS = new Int2ObjectOpenHashMap<>();
    /** Citizens whose stand-in could not be created or drawn: they keep the normal citizen look. */
    private static final IntSet BROKEN = new IntOpenHashSet();

    private ClientVassals() {}

    public static void setAppearance(int entityId, ResourceLocation type, CompoundTag nbt) {
        APPEARANCES.put(entityId, new Appearance(type, nbt));
        STAND_INS.remove(entityId);
        BROKEN.remove(entityId);
    }

    public static void forget(int entityId) {
        APPEARANCES.remove(entityId);
        STAND_INS.remove(entityId);
        BROKEN.remove(entityId);
    }

    public static void clear() {
        APPEARANCES.clear();
        STAND_INS.clear();
        BROKEN.clear();
    }

    public static void markBroken(int entityId, Throwable error) {
        if (BROKEN.add(entityId)) SoberaniaBridge.LOG.warn("Não deu para desenhar o vassalo {} com a aparência original", entityId, error);
    }

    @Nullable
    public static LivingEntity standInFor(LivingEntity citizen) {
        int id = citizen.getId();
        if (BROKEN.contains(id)) return null;
        Appearance appearance = APPEARANCES.get(id);
        if (appearance == null) return null;
        LivingEntity standIn = STAND_INS.get(id);
        if (standIn != null && standIn.level() == citizen.level()) return standIn;
        try {
            standIn = create(appearance, (ClientLevel) citizen.level());
        } catch (RuntimeException e) {
            markBroken(id, e);
            return null;
        }
        if (standIn == null) {
            markBroken(id, new IllegalStateException("tipo sem entidade viva: " + appearance.type()));
            return null;
        }
        STAND_INS.put(id, standIn);
        return standIn;
    }

    @Nullable
    private static LivingEntity create(Appearance appearance, ClientLevel level) {
        Entity entity = EntityType.byString(appearance.type().toString()).map(t -> t.create(level)).orElse(null);
        if (!(entity instanceof LivingEntity living)) return null;
        living.load(appearance.nbt());
        living.setNoGravity(true);
        return living;
    }

    /** Copies everything that drives the stand-in's pose and animation from the citizen. */
    public static void mirror(LivingEntity citizen, LivingEntity standIn) {
        standIn.setPos(citizen.getX(), citizen.getY(), citizen.getZ());
        standIn.xo = citizen.xo;
        standIn.yo = citizen.yo;
        standIn.zo = citizen.zo;
        standIn.xOld = citizen.xOld;
        standIn.yOld = citizen.yOld;
        standIn.zOld = citizen.zOld;
        standIn.setYRot(citizen.getYRot());
        standIn.yRotO = citizen.yRotO;
        standIn.setXRot(citizen.getXRot());
        standIn.xRotO = citizen.xRotO;
        standIn.yBodyRot = citizen.yBodyRot;
        standIn.yBodyRotO = citizen.yBodyRotO;
        standIn.yHeadRot = citizen.yHeadRot;
        standIn.yHeadRotO = citizen.yHeadRotO;
        standIn.tickCount = citizen.tickCount;

        WalkAnimationStateAccessor from = (WalkAnimationStateAccessor) citizen.walkAnimation;
        WalkAnimationStateAccessor to = (WalkAnimationStateAccessor) standIn.walkAnimation;
        to.soberania$setSpeedOld(from.soberania$getSpeedOld());
        to.soberania$setSpeed(from.soberania$getSpeed());
        to.soberania$setPosition(from.soberania$getPosition());

        standIn.swinging = citizen.swinging;
        standIn.swingTime = citizen.swingTime;
        standIn.swingingArm = citizen.swingingArm;
        standIn.attackAnim = citizen.attackAnim;
        standIn.oAttackAnim = citizen.oAttackAnim;
        standIn.hurtTime = citizen.hurtTime;
        standIn.hurtDuration = citizen.hurtDuration;
        standIn.deathTime = citizen.deathTime;

        standIn.setPose(citizen.getPose());
        citizen.getSleepingPos().ifPresentOrElse(standIn::setSleepingPos, standIn::clearSleepingPos);
        standIn.setOnGround(citizen.onGround());
        standIn.setInvisible(citizen.isInvisible());
        standIn.setCustomName(citizen.getCustomName());
        standIn.setCustomNameVisible(citizen.isCustomNameVisible());
        // Wear what the citizen wears, not what the monster wore when it swore.
        for (EquipmentSlot slot : EquipmentSlot.values()) {
            standIn.setItemSlot(slot, citizen.getItemBySlot(slot));
        }
    }

    static Minecraft minecraft() {
        return Minecraft.getInstance();
    }
}
