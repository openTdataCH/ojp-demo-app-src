export type RequestError = 'FetchError' | 'ParseTextError' | 'ParseTripsXMLError' | 'ParseLocationInformationRequestXMLError'

export interface RequestErrorData {
  error: RequestError
  message: string
}