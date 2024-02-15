export const protectionFromPoison = {
	initHeader: 		"What do you want to cast?"
}
export const giantInsect = {
	choices:			["Ten Giant Centipedes", "Three Giant Spiders", "Five Giant Wasps", "One Giant Scorpion"],
	defaultIcons:				[
							"systems/dnd5e/tokens/beast/GiantCentipede.webp",
							"systems/dnd5e/tokens/beast/GiantSpider.webp",
							"systems/dnd5e/tokens/beast/GiantWasp.webp",
							"systems/dnd5e/tokens/beast/GiantScorpion.webp"
						],
	initHeader:			"What do you want to create?",
	preEffectSeqPath:	"modules/jb2a_patreon/Library/2nd_Level/Misty_Step/MistyStep_01_Regular_Orange_400x400.webm",
	spawnNames:			["Giant Centipede", "Giant Spider", "Giant Wasp", "Giant Scorpion"]
}
export const summonCelestial = {
	choices:			["Celestial Avenger", "Celestial Defender"],
	defaultIcons:		[
							"systems/dnd5e/tokens/celestial/SolarBow.webp",
							"systems/dnd5e/tokens/celestial/Planetar.webp"
						],
	initHeader:			"What do you want to summon?",
	spawnNames:			["Celestial Avenger Spirit", "Celestial Defender Spirit"]
}
export const summonDraconicSpirit = {
	circleColors:		["green", "blue", "red", "yellow", "green", "blue", "green", "red", "yellow", "yellow"],
	choices:			["Chromatic Draconic Spirit", "Gem Draconic Spirit", "Metallic Draconic Spirit"],		
	defaultIcons:		[
							"systems/dnd5e/tokens/dragon/RedDragonAdult.webp",
							"systems/dnd5e/tokens/dragon/CopperDragonAdult.webp",
							"systems/dnd5e/tokens/dragon/GoldDragonAdult.webp"
						],	
	initHeader:			"Choose a draconic spirit to summon",
	impactColors:		["green", "blue", "01", "yellow", "green", "blue", "green", "red", "yellow", "yellow"],
	impactNums:			["003", "003", "fire", "003", "003", "003", "003", "003", "003", "003"],
	resistChoices:		["Acid", "Cold", "Fire", "Lightning", "Poison", "Force", "Necrotic", "Psychic", "Radiant", "Thunder"],
	resistIcons:		[
							"icons/magic/fire/dagger-rune-enchant-flame-strong-green.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-blue.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-red.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-blue-yellow.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-purple-pink.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-purple.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-green.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-purple-pink.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-blue-yellow.webp",
							"icons/magic/fire/dagger-rune-enchant-flame-strong-orange.webp"
						],
	resistHeader:		"Choose your damage resist type",
	resistValues:		["acid", "cold", "fire", "lightning", "poison", "force", "necrotic", "psychic", "radiant", "thunder"],
	spawnNames:			["Chromatic Draconic Spirit", "Gem Draconic Spirit", "Metallic Draconic Spirit"]
}
export const summonElemental = {
	circleColors:		["green", "blue", "red", "yellow"],
	choices:			["Air Elemental", "Earth Elemental", "Fire Elemental", "Water Elemental"],
	defaultIcons:		[
							"images/Tokens/Creatures/Elemental/Air_Large_Elemental_01.webp",
							"images/Tokens/Creatures/Elemental/Earth_Elemental_Large_Elemental_01.webp",
							"images/Tokens/Creatures/Elemental/Fire_Elemental_Large_Elemental_A_01.webp",
							"images/Tokens/Creatures/Elemental/Water_Large_Elemental_A_01.webp"
						],
	impactColors:		["white", "orange", "01", "blue"],
	impactNums:			["003", "003", "fire", "003"],						
	initHeader:			"What do you want to summon?",
	spawnNames:			["Air Elemental Spirit", "Earth Elemental Spirit", "Fire Elemental Spirit", "Water Elemental Spirit"]
}
export const summonUndead = {
	auraNames:			"Festering Aura",
	auraTemplateSrc:	"modules/JB2A_DnD5e/Library/1st_Level/Fog_Cloud/FogCloud_01_White_800x800.webm",	
	circleColors:		["green", "green", "green"],
	choices:			["Ghostly", "Putrid", "Skeletal"],
	//defaultIcons:		[
	//						"systems/dnd5e/tokens/undead/Ghost.webp",
	//						"systems/dnd5e/tokens/undead/Zombie.webp",
	//						"systems/dnd5e/tokens/undead/SkeletonClothes.webp"
	//					],
	impactColors:		["green", "green", "green"],
	impactNums:			["003", "003", "003"],						
	initHeader:			"What do you want to summon?",
	spawnAttacks:		["Deathly Touch", "Rotting Claw", "Grave Bolt"],
	spawnNames:			["Undead Spirit (Ghostly)", "Undead Spirit (Putrid)", "Undead Spirit (Skeletal)"]
}