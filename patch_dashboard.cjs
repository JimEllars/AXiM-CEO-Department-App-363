const fs = require('fs');
const file = 'src/pages/ExecutiveDashboard.jsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('ExecutiveCommsHub')) {
    code = code.replace(
        "import DirectiveDesk from '../components/DirectiveDesk';",
        "import DirectiveDesk from '../components/DirectiveDesk';\nimport ExecutiveCommsHub from '../components/ExecutiveCommsHub';"
    );
}

if (!code.includes('<ExecutiveCommsHub />')) {
    code = code.replace(
        "<MetricGrid />",
        "<MetricGrid />\n            <ExecutiveCommsHub />"
    );
}

fs.writeFileSync(file, code, 'utf8');
