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
            if (content.includes('includes(session.role)')) {
                content = content.replace(/includes\(session\.role\)/g, 'includes(session.role as string)')
                fs.writeFileSync(fullPath, content)
                console.log(`Updated: ${fullPath}`)
            }
        }
    }
}

processDir(path.resolve(__dirname, 'src/app/api'))
