package io.github.felipebfranco.soberania.bridge.vassal;

import io.github.felipebfranco.soberania.bridge.SoberaniaBridge;
import net.minecraft.core.Holder;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeInstance;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.Attributes;

/** Extra health and damage of a vassal. MineColonies recreates the entity often, so this is re-applied (idempotent). */
public final class VassalBody {
    private static final ResourceLocation HEALTH = ResourceLocation.fromNamespaceAndPath(SoberaniaBridge.MOD_ID, "vassal_health");
    private static final ResourceLocation DAMAGE = ResourceLocation.fromNamespaceAndPath(SoberaniaBridge.MOD_ID, "vassal_damage");

    private VassalBody() {}

    public static void apply(LivingEntity entity, Vassal vassal) {
        if (add(entity, Attributes.MAX_HEALTH, HEALTH, vassal.extraHealth())) {
            entity.setHealth(entity.getMaxHealth());
        }
        add(entity, Attributes.ATTACK_DAMAGE, DAMAGE, vassal.extraDamage());
    }

    private static boolean add(LivingEntity entity, Holder<Attribute> attribute, ResourceLocation id, double value) {
        if (value == 0) return false;
        AttributeInstance instance = entity.getAttribute(attribute);
        if (instance == null || instance.hasModifier(id)) return false;
        instance.addPermanentModifier(new AttributeModifier(id, value, AttributeModifier.Operation.ADD_VALUE));
        return true;
    }
}
