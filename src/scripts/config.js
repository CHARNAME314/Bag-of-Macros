export function setConfig() {
    setProperty(CONFIG, "test", {
        "module": "test",
		"automations": {
			"Blight": {
                "name": "Blight",
                "version": "0.0.1"
            },
			"Clairvoyance": {
                "name": "Clairvoyance",
                "version": "0.0.1"
            },
			"Daylight": {
                "name": "Daylight",
                "version": "0.0.1"				
			}
		}
	})
}