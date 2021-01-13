module.exports = `
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:air="http://www.travelport.com/schema/air_v47_0"
  xmlns:com="http://www.travelport.com/schema/common_v47_0"
  xmlns:univ="http://www.travelport.com/schema/universal_v47_0"
  >
  <soapenv:Header/>
  <soapenv:Body>
    <univ:UniversalRecordModifyReq AuthorizedBy="user" TargetBranch="{{TargetBranch}}" Version="{{version}}">
      <com:BillingPointOfSaleInfo OriginApplication="UAPI"/>
      {{#if emulatePcc}}
        <com:OverridePCC ProviderCode="{{provider}}" PseudoCityCode="{{emulatePcc}}"/>
      {{/if}}
      <univ:RecordIdentifier ProviderCode="{{provider}}" ProviderLocatorCode="{{pnr}}" UniversalLocatorCode="{{universalRecordLocatorCode}}"/>
      <univ:UniversalModifyCmd Key="BOOKING_MODIFY_SEGMENTS">
      {{#ssr}} 
        <univ:AirDelete ReservationLocatorCode="{{reservationLocatorCode}}" Element="{{element}}" {{#if bookingTravelerRef}}BookingTravelerRef="{{{bookingTravelerRef}}}" {{/if}}{{#if key}}Key="{{{key}}}"{{/if}}/>
      {{/ssr}}
      </univ:UniversalModifyCmd>
    </univ:UniversalRecordModifyReq>
  </soapenv:Body>
</soapenv:Envelope>
`;
