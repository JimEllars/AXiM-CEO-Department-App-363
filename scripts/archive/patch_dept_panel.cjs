const fs = require('fs');
const file = 'src/components/DepartmentPanel.jsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('useRealtimeTelemetry')) {
    code = code.replace(
        "import PanelDetailsModal from './PanelDetailsModal';",
        "import PanelDetailsModal from './PanelDetailsModal';\nimport { useRealtimeTelemetry } from '../hooks/useRealtime';"
    );

    code = code.replace(
        "function DepartmentPanel({ title, kicker, rows, kind }) {",
        `function DepartmentPanel({ title, kicker, rows, kind }) {
  const metrics = useRealtimeTelemetry();`
    );
}

fs.writeFileSync(file, code, 'utf8');
