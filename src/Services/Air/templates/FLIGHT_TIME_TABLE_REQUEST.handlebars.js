module.exports = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <air:FlightTimeTableReq AuthorizedBy="user" TargetBranch="{{TargetBranch}}"
            xmlns:air="http://www.travelport.com/schema/air_v47_0"
            xmlns:com="http://www.travelport.com/schema/common_v47_0">
            <com:BillingPointOfSaleInfo OriginApplication="uAPI"/>
            {{#if emulatePcc}}
            <com:OverridePCC ProviderCode="{{provider}}" PseudoCityCode="{{emulatePcc}}"/>
            {{/if}}

            <air:FlightTimeTableCriteria>
                <air:GeneralTimeTable 
                {{#if includeConnection}}IncludeConnection="true"{{/if}}
                StartDate="{{startDate}}"
                {{#if}}EndDate="{{endDate}}"{{/if}}>
                    <air:DaysOfOperation Mon="true" Tue="true" Wed="true" Thu="true" Fri="true" Sat="true" Sun="true" />
                    <air:FlightOrigin>
                        <com:CityOrAirport Code="{{from}}"></com:CityOrAirport>
                    </air:FlightOrigin>
                    <air:FlightDestination>
                        <com:CityOrAirport Code="{{to}}"></com:CityOrAirport>
                    </air:FlightDestination>
                </air:GeneralTimeTable>
            </air:FlightTimeTableCriteria>
        </air:FlightTimeTableReq>
    </soap:Body>
</soap:Envelope>
`;
