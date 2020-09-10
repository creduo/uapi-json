module.exports = `
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:air="http://www.travelport.com/schema/air_v47_0"
  xmlns:univ="http://www.travelport.com/schema/universal_v47_0"
  xmlns:com="http://www.travelport.com/schema/common_v47_0"
    <soapenv:Body>
        <univ:AirMerchandisingFulfillmentReq 
            AuthorizedBy="user" 
            TargetBranch="{{TargetBranch}}">
            <com:BillingPointOfSaleInfo OriginApplication="uAPI" />
            <air:HostReservation Carrier="UA" CarrierLocatorCode="GX3B71" ProviderCode="1G" ProviderLocatorCode="8M587G" UniversalLocatorCode="0TJ1O7" />
            <air:AirSolution>
                {{#each passengers}}
                <air:SearchTraveler Code="{{passengerTypeCode}}" BookingTravelerRef="{{uapi_traveler_ref}}" Key="{{@index}}">
                    <com:Name Prefix="{{prefix}}" First="{{firstName}}" Last="{{lastName}}" />
                </air:SearchTraveler>
                {{/each}}
                
                {{#each segments}}
                <air:AirSegment 
                    Key="{{@index}}"
                    ProviderCode="{{provider}}"
                    Group="{{#if group}}{{group}}{{else}}0{{/if}}"
                    Carrier="{{airline}}" FlightNumber="{{flightNumber}}"
                    Origin="{{from}}" Destination="{{to}}"
                    DepartureTime="{{departure}}"
                    ClassOfService="{{bookingClass}}" />
                <air:FareBasis Code="{{fareBasis}}" />
                {{/each}}
            </air:AirSolution>
            <air:SpecificSeatAssignment BookingTravelerRef="{{uapi_traveler_ref}}" SegmentRef="{{uapi_segment_ref}}" SeatId="{{seat_id}}" />
        </univ:AirMerchandisingFulfillmentReq>
    </soapenv:Body>
</soapenv:Envelope>
`;
