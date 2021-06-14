import { XPathOJP } from "../helpers/xpath-ojp";

export class Address {
  public addressCode: string
  public addressName: string | null
  public topographicPlaceRef: string | null

  constructor(addressCode: string, addressName: string | null, topographicPlaceRef: string | null) {
    this.addressCode = addressCode
    this.addressName = addressName
    this.topographicPlaceRef = topographicPlaceRef
  }

  public static initFromContextNode(contextNode: Node): Address | null {
    const addressCode = XPathOJP.queryText('ojp:Address/ojp:AddressCode', contextNode)
    if (addressCode === null) {
      return null
    }

    const addressName = XPathOJP.queryText('ojp:Address/ojp:AddressName/ojp:Text', contextNode)
    const topographicPlaceRef = XPathOJP.queryText('ojp:Address/ojp:TopographicPlaceRef', contextNode)

    const address = new Address(addressCode, addressName, topographicPlaceRef)

    return address
  }
}
