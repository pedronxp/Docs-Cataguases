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
            
            if (content.includes('((session.id as string) as string)')) {
                content = content.replace(/\(\(session\.id as string\) as string\)/g, '(session.id as string)')
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
