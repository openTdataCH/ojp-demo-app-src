import xpath from 'xpath'

const mapNS = {
    'siri' : 'http://www.siri.org.uk/siri',
    'ojp': 'http://www.vdv.de/ojp',
};

export class XpathOJP {
    public static queryNodes(xpathExpression: string, contextNode: Node): Node[] {
        const queryNS = xpath.useNamespaces(mapNS);
        const nodes = queryNS(xpathExpression, contextNode) as Node[];
        return nodes
    }

    public static queryNode(xpathExpression: string, contextNode: Node): Node | null {
        const nodes = XpathOJP.queryNodes(xpathExpression, contextNode)
        if (nodes.length === 0) {
            return null;
        }

        return nodes[0]
    }

    public static queryText(xpathExpression: string, contextNode: Node): string | null {
        const queryNS = xpath.useNamespaces(mapNS);
        const node = queryNS(xpathExpression, contextNode, true) as Node;
        if (!node) {
            return null;
        }

        const nodeText = node.textContent

        return nodeText
    }
}
