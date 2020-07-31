module.exports = `
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:air="http://www.travelport.com/schema/air_v47_0"
  xmlns:univ="http://www.travelport.com/schema/universal_v47_0"
  xmlns:com="http://www.travelport.com/schema/common_v47_0"
    <soapenv:Body>
        <air:SeatMapReq
            AuthorizedBy="user" 
            TargetBranch="{{TargetBranch}}"
            ReturnSeatPricing="true">
            <com:BillingPointOfSaleInfo OriginApplication="uAPI" />

            {{#each segments}}
            <air:AirSegment 
                Key="{{@index}}"
                ProviderCode="{{provider}}"
                Group="{{#if group}}{{group}}{{else}}0{{/if}}"
                Carrier="{{airline}}" FlightNumber="{{flightNumber}}"
                Origin="{{from}}" Destination="{{to}}"
                DepartureTime="{{departure}}"
                ClassOfService="{{bookingClass}}" />
            {{/each}}
            
            {{#each hosttoken}}
            <com:HostToken Key="6AuUuD3R2BKAmiskFAAAAA==">{{_}}</com:HostToken>
            {{/each}}

            {{if pnr}}
            <air:HostReservation
                Carrier="{{platingCarrier}}"
                CarrierLocatorCode="{{carrier_pnr}}"
                ProviderCode="{{provider}}"
                ProviderLocatorCode="{{pnr}}" 
                UniversalLocatorCode="{{uapi_ur_locator}}" />
            {{/if}}
            
            {{#if emulatePcc}}
            <com:OverridePCC ProviderCode="{{provider}}" PseudoCityCode="{{emulatePcc}}"/>
            {{/if}}
        </air:SeatMapReq>
    </soapenv:Body>
</soapenv:Envelope>
`;
