package io.github.felipebfranco.soberania.bridge.vassal;

import com.minecolonies.api.entity.citizen.Skill;
import io.github.manasmods.manascore.skill.api.ManasSkillInstance;
import io.github.manasmods.manascore.skill.api.SkillAPI;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.level.Level;

/**
 * Conversion table v1 (KB: estudo-vassalo-aparencia-e-atributos): rank by EP, race multipliers and bonuses
 * from the skills the monster learned beyond the ones its race is born with.
 */
public final class VassalProfile {
    /** MineColonies aptitudes, in the order of the race multiplier arrays. */
    private static final Skill[] APTITUDES = {
        Skill.Athletics, Skill.Dexterity, Skill.Strength, Skill.Agility, Skill.Stamina, Skill.Mana,
        Skill.Adaptability, Skill.Focus, Skill.Creativity, Skill.Knowledge, Skill.Intelligence
    };

    public record Rank(String name, double minEp, int level, int health, int damage) {}

    private static final List<Rank> RANKS = List.of(
        new Rank("SS", 800_000, 85, 60, 10),
        new Rank("S", 400_000, 70, 40, 8),
        new Rank("A+", 100_000, 55, 30, 6),
        new Rank("A", 10_000, 40, 20, 4),
        new Rank("B", 6_000, 30, 12, 3),
        new Rank("C", 3_000, 22, 8, 2),
        new Rank("D", 1_000, 14, 4, 1),
        new Rank("E", 0, 8, 0, 0));

    /** Races without a row here use neutral multipliers until they get their own. */
    private static final double[] NEUTRAL = {1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1};
    private static final Map<String, double[]> RACES = Map.of(
        "goblin", new double[] {1.1, 1.3, 0.8, 1.3, 1.0, 0.6, 1.1, 0.9, 1.0, 0.7, 0.7},
        "hobgoblin", new double[] {1.2, 1.3, 1.0, 1.3, 1.1, 0.7, 1.2, 1.0, 1.0, 0.9, 0.9});

    private static final Map<String, Map<Skill, Integer>> SKILL_BONUS = Map.ofEntries(
        Map.entry("tensura:strength", Map.of(Skill.Strength, 8)),
        Map.entry("tensura:starved", Map.of(Skill.Strength, 8)),
        Map.entry("tensura:corrosion", Map.of(Skill.Strength, 8)),
        Map.entry("tensura:self_regeneration", Map.of(Skill.Stamina, 5)),
        Map.entry("tensura:scale_armor", Map.of(Skill.Stamina, 5)),
        Map.entry("tensura:magic_resistance", Map.of(Skill.Mana, 5)),
        Map.entry("tensura:magic_sense", Map.of(Skill.Focus, 5, Skill.Knowledge, 3)),
        Map.entry("tensura:thought_communication", Map.of(Skill.Intelligence, 5, Skill.Adaptability, 3)),
        Map.entry("tensura:telepathy", Map.of(Skill.Intelligence, 5, Skill.Adaptability, 3)),
        Map.entry("tensura:earth_manipulation", Map.of(Skill.Strength, 3, Skill.Creativity, 5)),
        Map.entry("tensura:earth_transform", Map.of(Skill.Strength, 3, Skill.Creativity, 5)),
        Map.entry("tensura:water_manipulation", Map.of(Skill.Focus, 5)),
        Map.entry("tensura:flame_manipulation", Map.of(Skill.Creativity, 5, Skill.Athletics, 3)),
        Map.entry("tensura:flame_transform", Map.of(Skill.Creativity, 5, Skill.Athletics, 3)),
        Map.entry("tensura:wind_manipulation", Map.of(Skill.Agility, 5)));

    /** Skills each race is born with, measured once per race on a stand-in that joins the world for an instant. */
    private static final Map<String, Set<String>> INNATE = new HashMap<>();

    public final Rank rank;
    public final Map<Skill, Integer> aptitudes;
    public final int extraHealth;
    public final List<String> learnedSkills;

    private VassalProfile(Rank rank, Map<Skill, Integer> aptitudes, int extraHealth, List<String> learnedSkills) {
        this.rank = rank;
        this.aptitudes = aptitudes;
        this.extraHealth = extraHealth;
        this.learnedSkills = learnedSkills;
    }

    public static Rank rankFor(double ep) {
        for (Rank r : RANKS) {
            if (ep >= r.minEp()) return r;
        }
        return RANKS.getLast();
    }

    public static VassalProfile of(LivingEntity monster, String race, double ep) {
        Rank rank = rankFor(ep);
        double[] mult = RACES.getOrDefault(race, NEUTRAL);
        RandomSource random = monster.getRandom();
        Map<Skill, Integer> aptitudes = new EnumMap<>(Skill.class);
        for (int i = 0; i < APTITUDES.length; i++) {
            aptitudes.put(APTITUDES[i], (int) Math.round(rank.level() * mult[i]) + random.nextInt(3));
        }

        Set<String> innate = innateSkills(monster, race);
        List<String> learned = new ArrayList<>();
        int health = rank.health();
        for (String id : skillIds(monster)) {
            if (innate.contains(id)) continue;
            learned.add(id);
            SKILL_BONUS.getOrDefault(id, Map.of()).forEach((skill, bonus) -> aptitudes.merge(skill, bonus, Integer::sum));
            if (id.endsWith("_resistance")) health += 2;
            if (id.endsWith("_nullification")) health += 4;
        }
        health = Math.min(health, rank.health() + 20);
        aptitudes.replaceAll((skill, level) -> Math.max(1, Math.min(99, level)));
        return new VassalProfile(rank, aptitudes, health, learned);
    }

    private static List<String> skillIds(LivingEntity entity) {
        List<String> ids = new ArrayList<>();
        for (ManasSkillInstance skill : SkillAPI.getSkillsFrom(entity).getLearnedSkills()) {
            ids.add(skill.getSkillId().toString());
        }
        return ids;
    }

    private static Set<String> innateSkills(LivingEntity monster, String race) {
        Set<String> cached = INNATE.get(race);
        if (cached != null) return cached;
        Set<String> innate = new HashSet<>();
        Level level = monster.level();
        Entity mold = monster.getType().create(level);
        if (mold instanceof LivingEntity living) {
            living.moveTo(monster.getX(), monster.getY(), monster.getZ());
            level.addFreshEntity(living);
            if ("hobgoblin".equals(race) && living instanceof io.github.manasmods.tensura.entity.monster.GoblinEntity goblin) {
                goblin.evolve();
            }
            innate.addAll(skillIds(living));
            living.discard();
            INNATE.put(race, innate);
        }
        return innate;
    }
}
