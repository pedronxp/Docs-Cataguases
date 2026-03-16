const fs = require('fs')
const path = require('path')

function processDir(dir) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
            processDir(fullPath)
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8')
            let modified = false
            
            if (content.includes('session.id,')) {
                content = content.replace(/session\.id\,/g, '(session.id as string),')
                modified = true
            }
            if (content.match(/session\.id(?![a-zA-Z0-9_])/)) {
                 // Replace session.id with (session.id as string) where it's not followed by a dot, e.g., session.id
                 // Be careful not to replace things like session.idPlural
                 content = content.replace(/session\.id(?!\w)/g, '(session.id as string)')
                 modified = true
            }

            if (modified) {
                fs.writeFileSync(fullPath, content)
                console.log(`Updated: ${fullPath}`)
            }
        }
    }
}

processDir(path.resolve(__dirname, 'src/app/api'))
