import {setConfig} from './config.js';
import {macros} from "./macros.js"
import * as sf from "./socket-functions.js"

export let socket

Hooks.once("socketlib.ready", () => {
	socket = socketlib.registerModule("test")
	socket.register("setActiveEffectDelete", sf.setActiveEffectDelete)
	socket.register("setAmbientLightCreate", sf.setAmbientLightCreate)	
	socket.register("setAmbientLightDelete", sf.setAmbientLightDelete)
	socket.register("setDeleteSummonConcentrationHook", sf.setDeleteSummonConcentrationHook)
	socket.register("setMeasuredTemplateDelete", sf.setMeasuredTemplateDelete)
})

Hooks.on("dnd5e.restCompleted", (actor, data) => {
	macros.songOfHealing.main(actor, data)
})

globalThis['test'] = {
    macros
}