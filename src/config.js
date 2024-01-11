export function setConfig() {
    setProperty(CONFIG, 'test', {
        'module': 'test',
		'automations': {
			'Blight': {
                'name': 'Blight',
                'version': '0.0.1'
            }
		}
	})
}