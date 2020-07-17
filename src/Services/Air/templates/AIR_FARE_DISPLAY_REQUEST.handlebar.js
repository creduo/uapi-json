module.exports = `
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <air:AirFareDisplayReq
            AuthorizedBy="user" TraceId="{{requestId}}" TargetBranch="{{TargetBranch}}"

            Origin="{{from}}"
            Destination="{{to}}"
            ProviderCode="{{provider}}"
            
            xmlns:air="http://www.travelport.com/schema/air_v47_0"
            xmlns:com="http://www.travelport.com/schema/common_v47_0"
            >
            <com:BillingPointOfSaleInfo OriginApplication="uAPI"/>

            {{#if emulatePcc}}
            <com:OverridePCC ProviderCode="{{provider}}" PseudoCityCode="{{emulatePcc}}"/>
            {{/if}}

            <air:AirFareDisplayModifiers 
                {{#if departureDate}}DepartureDate="{{departureDate}}"{{/if}}
                {{#if returnDate}}ReturnDate="{{returnDate}}"{{/if}}
                FaresIndicator="PublicAndPrivateFares"
                IncludeSurcharges="true"
                IncludeEstimatedTaxes="true"
                {{#if validatedFaresOnly}}ValidatedFaresOnly="true"{{/if}}>
            </air:AirFareDisplayModifiers>                   
        </air:AirFareDisplayReq>
    </soap:Body>
</soap:Envelope>
`;
