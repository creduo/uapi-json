module.exports = `
<!--Release 33-->
<!--Version Dated as of 14/Aug/2015 18:47:44-->
<!--Air Low Fare Search For Galileo({{provider}}) Request-->
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <air:LowFareSearchReq
            AuthorizedBy="user" TraceId="{{requestId}}" TargetBranch="{{TargetBranch}}"
            ReturnUpsellFare="true"
            xmlns:air="http://www.travelport.com/schema/air_v47_0"
            xmlns:com="http://www.travelport.com/schema/common_v47_0"
            >
            <com:BillingPointOfSaleInfo OriginApplication="uAPI"/>
            {{#legs}}
            <air:SearchAirLeg>
                <air:SearchOrigin>
                    <com:CityOrAirport Code="{{from}}" PreferCity="true"/>
                </air:SearchOrigin>
                <air:SearchDestination>
                    <com:CityOrAirport Code="{{to}}" PreferCity="true"/>
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
                    <com:Provider Code="{{provider}}" xmlns:com="http://www.travelport.com/schema/common_v47_0"/>
                </air:PreferredProviders>
                {{#if carriers}}
                <air:PermittedCarriers>
                    {{#carriers}}
                        <com:Carrier Code="{{.}}" xmlns:com="http://www.travelport.com/schema/common_v47_0"/>
                    {{/carriers}}
                </air:PermittedCarriers>
                {{/if}}
            </air:AirSearchModifiers>
            {{#if flightType}}
             <air:FlightType 
                RequireSingleCarrier="false"
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
                {{#if flightType.nonStopDirects }}
                NonStopDirects="{{flightType.nonStopDirects}}" 
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
            {{#passengers}}
            <com:SearchPassenger Code="{{ageCategory}}"{{#if child}} Age="9"{{/if}} xmlns:com="http://www.travelport.com/schema/common_v47_0"/>
            {{/passengers}}
            {{#if pricing}}
            <air:AirPricingModifiers
                {{#if pricing.currency}}
                CurrencyType="{{pricing.currency}}"
                {{/if}}

                {{#if pricing.eTicketability}}
                ETicketability="{{pricing.eTicketability}}"
                {{/if}}
            />
            {{/if}}
            {{#if emulatePcc}}
            <air:PCC>
                <com:OverridePCC ProviderCode="{{provider}}" PseudoCityCode="{{emulatePcc}}"/>
            </air:PCC>
            {{/if}}
        </air:LowFareSearchReq>
    </soap:Body>
</soap:Envelope>
`;
