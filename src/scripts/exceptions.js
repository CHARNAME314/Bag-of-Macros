//refactor to import strings and merge them?
//figure out if this can be a stand alone file somehow first 
export const summonCelestial = {
	choices:			["Celestial Avenger", "Celestial Defender"],
	defaultIcons:		[
							"images/Tokens/Creatures/Celestial/Solar_Large_Scale200_Celestial_A_11.webp",
							"images/Tokens/Creatures/Celestial/Planetar_Large_Scale150_Celestial_11.webp"
						],	
	exceptionActorNames:["Jakar", "Jakar (Test)"],
	initHeader:			"What do you want to summon?",
	sequencerData:		{
							options: {
								circleColor1: "dark_purple",
								circleColor2: "dark_purple",
								circleNum: "02",
								impactColor1: "dark_purple",
								impactColor2: "dark_purple",
								fadeIn: {ms: 400},
								impactNum1: "011",
								impactNum2: "003",
								scale: .15,
								school: "conjuration",
							}
						},
	spawnNames:			["Celestial Avenger Spirit", "Celestial Defender Spirit"]
}
export const summonDraconicSpirit = {
	circleColors:		["green", "blue", "red", "yellow", "green", "dark_purple", "dark_green", "pink", "dark_yellow", "yellow"],
	choices:			["Chromatic Draconic Spirit", "Gem Draconic Spirit", "Metallic Draconic Spirit"],		
	defaultIcons:		[
							"images/Tokens/Spirits/Spirit_Creatures/Young_Red_Dragon_Large_Scale200_Spirit_01.webp",
							"images/Tokens/Spirits/Spirit_Creatures/Young_Bronze_Dragon_Large_Scale200_Spirit_01.webp",
							"images/Tokens/Spirits/Spirit_Creatures/Young_Gold_Dragon_Large_Scale200_Spirit_01.webp"
						],	
	exceptionActorNames:"all",
	initHeader:			"Choose a draconic spirit to summon",
	impactColors:		["green", "blue", "01", "yellow", "green", "dark_purple", "green", "pinkpurple", "blue", "orange"],
	impactNums:			["003", "010", "fire", "011", "009", "003", "003", "003", "003", "003"],
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
	circleColors:		["yellow", "green", "yellow", "blue"],
	choices:			["Air Elemental", "Earth Elemental", "Fire Elemental", "Water Elemental"],
	defaultIcons:		[
							"images/Tokens/Creatures/Elemental/Air_Large_Elemental_01.webp",
							"images/Tokens/Creatures/Elemental/Earth_Elemental_Large_Elemental_01.webp",
							"images/Tokens/Creatures/Elemental/Fire_Elemental_Large_Elemental_A_01.webp",
							"images/Tokens/Creatures/Elemental/Water_Large_Elemental_A_01.webp"
						],
	exceptionActorNames:"all",						
	impactColors:		["white", "orange", "01", "blue"],
	impactNums:			["009", "009", "fire", "009"],
	initHeader:			"What do you want to summon?",
	spawnNames:			["Air Elemental Spirit", "Earth Elemental Spirit", "Fire Elemental Spirit", "Water Elemental Spirit"]
}
export const summonUndead = {
	auraAbility:		"int",
	auraName:			"Festering Aura",
	auraTemplateSrc:	"modules/jb2a_patreon/Library/3rd_Level/Spirit_Guardians/SpiritGuardiansParticles_01_Light_Green_600x600.webm",
	baseHp:				[30, 40],
	circleColors:		["dark_purple", "dark_purple", "dark_purple"],
	choices:			["Ghostly", "Putrid", "Skeletal"],
	defaultIcons:		[
							"images/Tokens/My%20Heroes/jakar_clone.webp",
							"images/Tokens/My%20Heroes/jakar_clone_green.webp",
							"images/Tokens/Adversaries/Skeletons/Skeleton_Caster_Robed_Hooded_03.webp"
						],
	exceptionActorNames:["Jakar", "Jakar (Test)"],
	impactColors:		["dark_purple", "dark_purple", "dark_purple"],
	impactNums:			["003", "003", "003"],
	isException:		true,
	initHeader:			"What do you want to summon?",
	spawnAttacks:		["Deathly Touch", "Claw of Entropy", "Grave Bolt"],
	spawnNames:			["Shadow Clone (Ghostly)", "Shadow Clone (Putrid)", "Shadow Clone (Skeletal)"],
	tokenTextures:		["", "", "images/Tokens/Adversaries/Skeletons/Skeleton_Caster_Robed_Hooded_Magic_03.webp"]
}