module.exports = `
<!--Release 33-->
<!--Version Dated as of 14/Aug/2015 18:47:44-->
<!--Air Low Fare Search For Galileo({{provider}}) Request-->
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        {{#if async}}
        <air:LowFareSearchAsynchReq
            AuthorizedBy="user" TraceId="{{requestId}}" TargetBranch="{{TargetBranch}}"
            ReturnUpsellFare="true"
            xmlns:air="http://www.travelport.com/schema/air_v47_0"
            xmlns:com="http://www.travelport.com/schema/common_v47_0"
            >
        {{else}}
        <air:LowFareSearchReq
            AuthorizedBy="user" TraceId="{{requestId}}" TargetBranch="{{TargetBranch}}"
            ReturnUpsellFare="true"
            {{#if solutionResult}}
            SolutionResult="true"
            {{/if}}
            xmlns:air="http://www.travelport.com/schema/air_v47_0"
            xmlns:com="http://www.travelport.com/schema/common_v47_0"
            >
        {{/if}}
            <com:BillingPointOfSaleInfo OriginApplication="uAPI"/>
            {{#legs}}
            <air:SearchAirLeg>
                <air:SearchOrigin>
                    <com:{{#if fromCodeType}}{{fromCodeType}}{{else}}CityOrAirport PreferCity="true"{{/if}} Code="{{from}}"/>
                </air:SearchOrigin>
                <air:SearchDestination>
                    <com:{{#if toCodeType}}{{toCodeType}}{{else}}CityOrAirport PreferCity="true"{{/if}} Code="{{to}}"/>
                </air:SearchDestination>
                <air:SearchDepTime PreferredTime="{{departureDate}}"/>
                <air:AirLegModifiers>
                    {{#*inline "connectionPoint"}}
                      <com:ConnectionPoint>
                        <com:CityOrAirport Code="{{connection}}" />
                      </com:ConnectionPoint>
                    {{/inline}}

                    {{#if ../permittedConnectionPoints}}
                    <air:PermittedConnectionPoints>
                    {{#each ../permittedConnectionPoints as |connection|}}
                      {{> connectionPoint connection=connection}}
                    {{/each}}
                    </air:PermittedConnectionPoints>
                    {{/if}}

                    {{#if ../prohibitedConnectionPoints}}
                    <air:ProhibitedConnectionPoints>
                    {{#each ../prohibitedConnectionPoints as |connection| }}
                      {{> connectionPoint connection=connection}}
                    {{/each}}
                    </air:ProhibitedConnectionPoints>
                    {{/if}}

                    {{#if ../preferredConnectionPoints}}
                    <air:PreferredConnectionPoints>
                    {{#each ../preferredConnectionPoints as |connection|}}
                      {{> connectionPoint connection=connection}}
                    {{/each}}
                    </air:PreferredConnectionPoints>
                    {{/if}}
                
                    {{#if ../cabins}}
                    <air:PreferredCabins>
                        {{#each ../cabins}}
                        <com:CabinClass Type="{{this}}"/>
                        {{/each}}
                    </air:PreferredCabins>
                    {{/if}}
                    {{#if ../bookingClass}}
                    <air:PermittedBookingCodes>
                        {{#each ../bookingClass}}
                            <air:BookingCode Code="{{this}}" />
                        {{/each}}
                    </air:PermittedBookingCodes>
                    {{/if}}    
                </air:AirLegModifiers>
            </air:SearchAirLeg>
            {{/legs}}
            <air:AirSearchModifiers
                {{#if maxJourneyTime}}
                    MaxJourneyTime="{{maxJourneyTime}}"
                {{/if}}
                {{#if maxSolutions}}
                    MaxSolutions="{{maxSolutions}}"
                {{/if}}
            >
                <air:PreferredProviders>
                    <com:Provider Code="{{provider}}" />
                </air:PreferredProviders>
                {{#if carriers}}
                <air:PermittedCarriers>
                    {{#carriers}}
                        <com:Carrier Code="{{.}}" />
                    {{/carriers}}
                </air:PermittedCarriers>
                {{/if}}
              {{#if flightType}}
              <air:FlightType 
                  RequireSingleCarrier="false"
                  {{#if flightType.nonStopDirects }}
                  NonStopDirects="{{flightType.nonStopDirects}}"
                  MaxConnections="0"
                  MaxStops="0"
                  {{else}} 
                    {{#if flightType.maxConnections }}
                    MaxConnections="{{ flightType.maxConnections }}"
                    {{else}}
                    MaxConnections="-1"
                    {{/if}}
                    {{#if flightType.maxStops }}
                    MaxStops="{{ flightType.maxStops }}"
                    {{else}}
                    MaxStops="-1"
                    {{/if}}
                  {{/if}}
                  {{#if flightType.stopDirects }}
                  StopDirects="{{flightType.stopDirects}}" 
                  {{/if}}
                  {{#if flightType.singleOnlineCon }}
                  SingleOnlineCon="{{flightType.singleOnlineCon}}"
                  {{/if}}
                  {{#if flightType.doubleOnlineCon }}
                  DoubleOnlineCon="{{flightType.doubleOnlineCon}}"
                  {{/if}}
                  {{#if flightType.tripleOnlineCon }}
                  TripleOnlineCon="{{flightType.tripleOnlineCon}}"
                  {{/if}}
                  {{#if flightType.singleInterlineCon }}
                  SingleInterlineCon="{{flightType.singleInterlineCon}}"
                  {{/if}}
                  {{#if flightType.doubleInterlineCon }}
                  DoubleInterlineCon="{{flightType.doubleInterlineCon}}"
                  {{/if}}
                  {{#if flightType.tripleInterlineCon }}
                  TripleInterlineCon="{{flightType.tripleInterlineCon}}"
                  {{/if}}
                  />
              {{/if}}
            </air:AirSearchModifiers>

            {{#passengers}}
            <com:SearchPassenger Code="{{ageCategory}}"{{#if child}} Age="9"{{/if}} />
            {{/passengers}}
            <air:AirPricingModifiers
              {{#if priсing}}
                {{#if pricing.currency}}
                CurrencyType="{{pricing.currency}}"
                {{/if}}
                {{#if pricing.eTicketability}}
                ETicketability="{{pricing.eTicketability}}"
                {{/if}}
                {{#if pricing.faresIndicator}}
                FaresIndicator="{{pricing.faresIndicator}}"
                {{else}}
                FaresIndicator="PublicAndPrivateFares"
                {{/if}}
              {{/if}}
              {{#if platingCarrier}}
                PlatingCarrier="{{platingCarrier}}"
              {{/if}}
            {{#if business}}
            >
                <air:PermittedCabins>
                    <com:CabinClass Type="Business" />
                </air:PermittedCabins>
            </air:AirPricingModifiers>   
            {{else}}
            />
            {{/if}}

            {{#if emulatePcc}}
            <air:PCC>
                <com:OverridePCC ProviderCode="{{provider}}" PseudoCityCode="{{emulatePcc}}"/>
            </air:PCC>
            {{/if}}

        {{#if async}}
        </air:LowFareSearchAsynchReq>
        {{else}}
        </air:LowFareSearchReq>
        {{/if}}
    </soap:Body>
</soap:Envelope>
`;
