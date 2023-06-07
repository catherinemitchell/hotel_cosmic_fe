import React, { useState } from "react";
import Button from "../components/Button";
import InvoicePopup from "./Invoice";

import Accordion from 'react-bootstrap/Accordion';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

import "./styles/navbar-styles.css";
import "./styles/reservations-styles.css";
import './styles/calender.css';


import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import InputGroup from 'react-bootstrap/InputGroup';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import customerPayment from "../hooks/stripe_payment";
import { loadStripe } from '@stripe/stripe-js';

import { useReservations } from "../hooks/reservationHook";
import { useCustomers } from "../hooks/customerHook";
import { useInvoices } from "../hooks/invoicesHook";

import { useNavigate } from "react-router-dom";

export default function Reservations(props) {
  //const [reservationEmail, setReservationEmail] = useState("");
  const [reservationID, setReservationID] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const navigate = useNavigate();
  const [showInvoice, setShowInvoice] = useState(false);
  const [newInvoice, setNewInvoice] = useState(null);

  // const [reservationError, setReservationError] = useState({
  //   reservationEmail: "",
  //   reservationID: "",
  // });
  const [error, setError] = useState({
    email: "",
    name: "",
    room: "",
    username: "",
    card: "",
  });

  const [reservationData, setReservationData] = useState({
    checkInDate: "",
    checkOutDate: "",
    customerId: "",
    roomId: "",
    totalPrice: 0,
  });

  const stripe = useStripe();
  const elements = useElements();

  const [date, setDate] = useState(new Date());

  const { addReservation, getReservationById } = useReservations();
  const { addCustomer } = useCustomers();
  const { addInvoice } = useInvoices();

  const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

  const handleSubmit = async () => {
    // if successful payment
    const card = elements.getElement(CardElement);
    const amount = 5000;
    const currency = "CAD";
    const paymentMethod = "card";


    await customerPayment({ amount, currency, paymentMethod })
      .then(clientSecret => {
        // Use the clientSecret for the client-side payment flow

        // Call the Stripe.js function to confirm the payment using the clientSecret
        stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: card
          }
        }).then(result => {
          // Handle the payment result
          if (result.error) {
            console.error('Payment failed:', result.error.message);
          } else if (result.paymentIntent.status === 'succeeded') {
            //needs to be discussed
            console.log('Payment sucess')
          }
        }).catch(error => {
          console.error('Error confirming payment:', error);
        });
      })
      .catch(error => {
        console.error('Payment intent creation failed:', error);
      });

    // make the data an object ready for the hook
    await addCustomer({ name, email })

      .then((customer) => {
        //We should have a calculation here Price per day * (checkOutDate - checkInDate)
        const { totalPrice } = reservationData;
        let customerId = customer.id;


        //const { totalPrice } = reservationData;

        // const totalPrice = 80.0;
        addReservation({
          checkInDate: date[0],
          checkOutDate: date[1],
          customerId,
          roomId: room,
          totalPrice,
        }).then((reservations) => {
          // must return reservations id

          const description = `${name},${email},Moon Room`;
          const reservations_id = reservations.id;

          addInvoice({ reservations_id, description }).then((newInvoice1) => {
            // prepare data for Invoice Pop up and display
            // set entire invoice object to the newInvoice state to use it later.
            setNewInvoice(newInvoice1);
            setShowInvoice(true);
            alert("Reserviation booked!")
          });
        });
      });
  };

  // const handleReservationSubmit = () => {
  //   // reservationID, reservationEmail
  //   getReservationById(reservationID)
  //     .then((reservation) => {

  //       // We need to call a pop up here to display the data from reservation

  //       // We need to call a pop up here to display the data from reservation

  //       // const { id, check_in_date, check_out_date, customer_id, date_reserved, room_id, total_price
  //       //} =  reservation 
  //       alert(`Reservation is :`);


  //     });

  // };

  // function validateReservation(event) {
  //   event.preventDefault();

  //   let errorExists = false;

  //   if (reservationEmail === "") {
  //     errorExists = true;
  //     setReservationError((prevError) => {
  //       return {
  //         ...prevError,
  //         reservationEmail: "Please enter email",
  //       };
  //     });
  //   }

  //   if (reservationID === "") {
  //     errorExists = true;
  //     setReservationError((prevError) => {
  //       return {
  //         ...prevError,
  //         reservationID: "Please enter your reservation ID",
  //       };
  //     });
  //   }
  //   if (!errorExists) {
  //     handleReservationSubmit();
  //   }
  // }

  async function validateBooking(event) {
    event.preventDefault();

    let errorExists = false;

    if (name === "") {
      errorExists = true;
      setError((prevError) => {
        return {
          ...prevError,
          name: "Please enter name",
        };
      });
    }

    if (name.trim().length < 2) {
      errorExists = true;
      setError((prevError) => {
        return {
          ...prevError,
          name: "Name must be at least 2 characters",
        };
      });
    }

    if (email === "") {
      errorExists = true;
      setError((prevError) => {
        return {
          ...prevError,
          email: "Please enter email",
        };
      });
    }

    if (room === "") {
      errorExists = true;
      setError((prevError) => {
        return {
          ...prevError,
          room: "Please select a room",
        };
      });
      // return;
    }

    if (!stripe || !elements) {
      return;
    }
    // Get a reference to a mounted CardElement. Elements knows how
    // to find your CardElement because there can only ever be one of
    // each type of element.
    const card = elements.getElement(CardElement);

    if (card == null) {
      return;
    }
    // Use your card Element with other Stripe.js APIs
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card,
    });

    if (error) {
      console.log("[error]", error);
      setError((prevError) => {
        return {
          ...prevError,
          card: error.message,
        };
      });
      return;
    } else {
      console.log("[PaymentMethod]", paymentMethod);
    }

    if (!errorExists) {
      handleSubmit({ name, email, room, card: paymentMethod.id });
    }
  }

  return (
    <div className="reservations-body">
      <article className="top-image">
        <h1 className="title">Reservations</h1>
      </article>

      {/* <div className="search-img">
        <Card style={{ width: "60rem" }}>
          <Card.Img
            variant="top"
            src="https://www.optics-trade.eu/blog/wp-content/uploads/2020/12/Telescope-VS-Binoculars.jpg"
          />
          <Card.Body>
            <Card.Title>Looking for an existing reservation?</Card.Title>
            <Form onSubmit={validateReservation}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label>Email address</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type="email"
                    placeholder="Enter email"
                    onChange={(e) => setReservationEmail(e.target.value)}
                    value={reservationEmail}
                    isInvalid={!!reservationError.reservationEmail}
                  />
                  <Form.Control.Feedback type="invalid" tooltip>
                    {reservationError.reservationEmail}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              <Form.Group className="mb-3" controlId="formBasicReservationId">
                <Form.Label>Reservation ID</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    type="text"
                    placeholder="Enter Reservation ID"
                    onChange={(e) => setReservationID(e.target.value)}
                    value={reservationID}
                    isInvalid={!!reservationError.reservationID}
                  />
                  <Form.Control.Feedback type="invalid" tooltip>
                    {reservationError.reservationID}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              <Button variant="primary" type="submit" text="Search" />
            </Form>
          </Card.Body>
        </Card>
      </div> */}

      <div className="form-background">
        <div className="form">
          <Card
            style={{
              width: "50rem",
              backgroundColor: "white",
              paddingLeft: "20px",
              paddingRight: "20px",
            }}
          >
            <Form onSubmit={validateBooking}>
              <Form.Group as={Col} className="mb-3" controlId="formGroupEmail">
                <Col xs="auto">
                  <Form.Group className="mb-3" controlId="formBasicEmail">
                    <Form.Label>Email address</Form.Label>
                    <InputGroup hasValidation>
                      <Form.Control
                        size="lg"
                        type="email"
                        placeholder="Enter email"
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                        isInvalid={!!error.email}
                      />
                      <Form.Control.Feedback type="invalid" tooltip>
                        {error.email}
                      </Form.Control.Feedback>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Your information is secured with us, it will never be
                      shared.
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Form.Group>
              <Form.Group className="mb-3" controlId="formBasicPassword">
                <Form.Label>Full Name</Form.Label>
                <InputGroup hasValidation>
                  <Form.Control
                    size="lg"
                    type="name"
                    placeholder="Full name"
                    onChange={(e) => setName(e.target.value)}
                    value={name}
                    isInvalid={!!error.name}
                  />
                  <Form.Control.Feedback type="invalid" tooltip>
                    {error.name}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Room Selector</Form.Label>
                <InputGroup hasValidation>
                  <Form.Select
                    size="lg"
                    onChange={(e) => setRoom(e.target.value)}
                    value={room}
                    isInvalid={!!error.room}
                  >
                    <option>Select a room</option>
                    <option value="1">Moon theme room</option>
                    <option value="2">Venus Theme room</option>
                    <option value="3">Jupiter Theme room</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid" tooltip>
                    {error.room}
                  </Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
              <Accordion>
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Calender</Accordion.Header>
                  <Accordion.Body>
                    <div className="calender">
                      <h1 className="text-center">
                        Choose your arrival and departure date
                      </h1>
                      <div className="calendar-container">
                        <Calendar
                          onChange={setDate}
                          value={date}
                          selectRange={true}
                          minDate={new Date(2023, 5, 16)}
                        />
                      </div>
                      {date.length > 0 ? (
                        <p className="text-center">
                          <span className="bold">Start:</span>{" "}
                          {date[0].toDateString()}
                          &nbsp;|&nbsp;
                          <span className="bold">End:</span> {date[1].toDateString()}
                        </p>
                      ) : (
                        <p className="text-center">
                          <span className="bold">Default selected date:</span>{" "}
                          {date.toDateString()}
                        </p>
                      )}
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
              {/* <fieldset>
                <Form.Group as={Col} className="mb-3">
                  <Form.Label as="legend" column xs="auto">
                    Activities
                  </Form.Label>
                  <Col xs="auto">
                    <Form>
                      <Form.Check
                        type="switch"
                        id="custom-switch1"
                        label="Massage"
                      />
                      <Form.Check
                        type="switch"
                        id="custom-switch2"
                        label="Facial"
                      />
                      <Form.Check
                        type="switch"
                        id="custom-switch3"
                        label="Mars Mud bath"
                      />
                    </Form>
                  </Col>
                </Form.Group>
              </fieldset> */}

              <Form.Group className="mb-3">
                <Form.Label>Payment Information</Form.Label>
                <CardElement
                  options={{
                    style: {
                      base: {
                        fontSize: "16px",
                        color: "#424770",
                        "::placeholder": {
                          color: "#aab7c4",
                        },
                      },
                      invalid: {
                        color: "#9e2146",
                      },
                    },
                  }}
                />
                {/* <InputGroup hasValidation>
                  <Form.Control.Feedback type="invalid" tooltip>
                    {error.card}
                  </Form.Control.Feedback>
                </InputGroup> */}
                {error.card && (<div>{error.card}</div>)}
              </Form.Group>


              <Form.Group as={Col} className="mb-3">
                <Col xs="auto">
                  <Button size="lg" type="submit" text="Book now!" />
                </Col>
              </Form.Group>
            </Form >
          </Card >
        </div >
      </div >
      {/* <div>
        {showInvoice && (
          <InvoicePopup
            invoiceData={newInvoice}
            setShowInvoice={setShowInvoice}
          />
        )}
      </div> */}
    </div >
  );
}
