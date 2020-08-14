#!/usr/bin/perl

use strict; use warnings;

use feature qw/ state /;

use FindBin qw/ $Bin /;
use Plack::Request;
use Plack::Response;
use JSON qw(encode_json);

use Mail::Message;

my $app = sub {

    my $req = Plack::Request->new( shift );
    my $query     = $req->body_parameters;

    my $forename = $query->get('forename');
    my $surname  = $query->get('surname');
    my $email    = $query->get('email');
    my $postcode = $query->get('postcode');

    my $body = << "_BODY";
A new member has joined:

Surname: $surname
Forename: $forename
Email: $email
Postcode: $postcode
_BODY

    #use Data::Dumper; say STDERR $query->get('submit');
    Mail::Message->build
      ( To             => 'info@westminsterstreets.org.uk'
      , From           => 'andy@andybev.com'
      , Subject        => "New member"
      , data           => $body
      )->send(via => 'postfix');

    my $res = Plack::Response->new( 200 );
    $res->headers([ 'Content-Type' => 'application/json' ]);
    $res->body( encode_json({ success => 1 }) );
    $res->finalize;
};

use Plack::Handler::CGI;
Plack::Handler::CGI->new->run($app);
