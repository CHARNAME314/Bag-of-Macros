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
								circleNum: "02",
								color: "dark_purple",
								fadeIn: {ms: 400},
								impactNum1: "011",
								impactNum2: "003",
								scale: .15,
								school: "conjuration",
							}
						},
	spawnNames:			["Celestial Avenger Spirit", "Celestial Defender Spirit"]
}