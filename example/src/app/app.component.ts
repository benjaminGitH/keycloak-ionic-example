import { Component, NgZone, OnInit } from '@angular/core';
import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Platform } from '@ionic/angular';
import { ActivatedRoute, Params, Router, UrlSerializer } from '@angular/router';
import { SignatureTestService } from './signature-test.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit{
  public userProfile: any;
  public hasValidAccessToken = false;
  public realmRoles: string[] = [];

  /**
   * Configuring the library
   * @param oauthService
   * @param zone
   * @param platform
   * @param activatedRoute
   * @param router
   */
  constructor(private oauthService: OAuthService, private zone: NgZone, private platform: Platform,
              private activatedRoute: ActivatedRoute, private router: Router, private signatureTestService: SignatureTestService) {
    if (this.platform.is('ios') && this.platform.is('capacitor')){
      this.configureIOS();
    }else if(this.platform.is('desktop')){
      this.configureWeb();
    }else{
      alert("This platform is not supported.")
    }
  }

  ngOnInit(): void {

    // this.testSignature()
    this.signatureTestService.testSignature();
    const data = "producteur=Koto RANDRIA;date_expiration=11-09-2025;";
    // Replace these with your actual PEM and signature from Java
    const publicKeyPem =  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmwGk1zw1dsIQ71TBH/II
8s8hHsyBir1GNHC2hIMFD9w2oqi84YMlcosatvNEa0FOUOnYTY8DJcq57OfCQEhM
zscLxEqb5zw7D5labgD0YTxJ+sF3KNaw9KpEX6uAw3dHgN6CnyL1WdJoVLqj+10e
MlcSexpFuvYCeWJLTEqVW0h/7lCD/xRZEFop/kE7jAeXbviKf7sEE9Yaptnn3Nhq
IKJBKeHf7HksKSQQxvy+L7FyrsRSfv/ZA4GVYyz2vf6w92ztcOT60dL/Ca4H13i4
R4AF1E/6zsXdWQUKQbtoj6XKcL04F9t19sRosilDVbhZtMDsN/+TnztNAlNBuGBq
QQIDAQAB
-----END PUBLIC KEY-----`;
    const signatureBase64 = "Hvkq4iaTttuz4OpnvWDWJKQyhrfH08zovQ/Pc4SNkJquw7J8OOGG1qDK9dwoDnlTpI258nsaeKFfeBfWl1wBnCZVhMkPr+GC03fEpMsrzwzlQ3GONaGUgtPsbUjnvGh2DKrTdjypgVuryBsWbFepOgD/qgczzGeRHlNheuO3OIYV+olW/BAa665ee/v7xZ8rTbXj3SkEoSLKJvBLI6TdQlwPx1YBDuXOf5Dbnu/h2llww6zN4HQd1VIozGk10rxptSUl3rIr9KledGgB4OUdHD3pC6ORAniN7eM36RVK4rWu2LA5HwBPSUgeNjg3/O45OP7QyOS8cOBaoPs0AI/eWg==";

    // this.verifySignature(data, publicKeyPem, signatureBase64)
    // .then(isValid => {
    //   console.log("Is signature validated?", isValid); // isValid is a boolean
    //   return isValid; // Ensure the callback returns a boolean
    // })

    /**
     * Load discovery document when the app inits
     */
    this.oauthService.loadDiscoveryDocument()
      .then(loadDiscoveryDocumentResult => {
        console.log("loadDiscoveryDocument", loadDiscoveryDocumentResult);

        /**
         * Do we have a valid access token? -> User does not need to log in
         */
        this.hasValidAccessToken = this.oauthService.hasValidAccessToken();

        /**
         * Always call tryLogin after the app and discovery document loaded, because we could come back from Keycloak login page.
         * The library needs this as a trigger to parse the query parameters we got from Keycloak.
         */
        this.oauthService.tryLogin().then(tryLoginResult => {
          console.log("tryLogin", tryLoginResult);
          if (this.hasValidAccessToken){
            this.loadUserProfile();
            this.realmRoles = this.getRealmRoles();
          }
        });

      })
      .catch(error => {
        console.error("loadDiscoveryDocument", error);
      });

    /**
     * The library offers a bunch of events.
     * It would be better to filter out the events which are unrelated to access token - trying to keep this example small.
     */
    this.oauthService.events.subscribe(eventResult => {
      console.debug("LibEvent", eventResult);
      this.hasValidAccessToken = this.oauthService.hasValidAccessToken();
    })
  }

  /**
   * Calls the library loadDiscoveryDocumentAndLogin() method.
   */
  public login(): void {
    this.oauthService.loadDiscoveryDocumentAndLogin()
      .then(loadDiscoveryDocumentAndLoginResult => {
        console.log("loadDiscoveryDocumentAndLogin", loadDiscoveryDocumentAndLoginResult);
      })
      .catch(error => {
        console.error("loadDiscoveryDocumentAndLogin", error);
      });
  }

  /**
   * Calls the library revokeTokenAndLogout() method.
   */
  public logout(): void {
    this.oauthService.revokeTokenAndLogout()
      .then(revokeTokenAndLogoutResult => {
        console.log("revokeTokenAndLogout", revokeTokenAndLogoutResult);
        this.userProfile = null;
        this.realmRoles = [];
      })
      .catch(error => {
        console.error("revokeTokenAndLogout", error);
      });
  }

  /**
   * Calls the library loadUserProfile() method and sets the result in this.userProfile.
   */
  public loadUserProfile(): void {
    this.oauthService.loadUserProfile()
      .then(loadUserProfileResult => {
        console.log("loadUserProfile", loadUserProfileResult);
        this.userProfile = loadUserProfileResult;
      })
      .catch(error => {
        console.error("loadUserProfile", error);
      });
  }

  /**
   *  Use this method only when an id token is available.
   *  This requires a specific mapper setup in Keycloak. (See README file)
   *
   *  Parses realm roles from identity claims.
   */
  public getRealmRoles(): string[] {
    let idClaims = this.oauthService.getIdentityClaims()
    if (!idClaims){
      console.error("Couldn't get identity claims, make sure the user is signed in.")
      return [];
    }
    if (!idClaims.hasOwnProperty("realm_roles")){
      console.error("Keycloak didn't provide realm_roles in the token. Have you configured the predefined mapper realm roles correct?")
      return [];
    }

    let realmRoles = idClaims["realm_roles"]
    return realmRoles ?? [];
  }

  /**
   * Configures the app for web deployment
   * @private
   */
  private configureWeb(): void {
    console.log("Using web configuration")
    let authConfig: AuthConfig = {
      issuer: "https://tech.soappro.mg/auth/realms/soatech",
      redirectUri: "http://localhost:8100",
      clientId: 'soatech-mobile-application-id',
      responseType: 'code',
      scope: 'openid profile email offline_access',
      // Revocation Endpoint must be set manually when using Keycloak
      // See: https://github.com/manfredsteyer/angular-oauth2-oidc/issues/794
      revocationEndpoint: "https://tech.soappro.mg/auth/realms/soatech/protocol/openid-connect/revoke",
      showDebugInformation: true,
      requireHttps: false
    }
    this.oauthService.configure(authConfig);
    this.oauthService.setupAutomaticSilentRefresh();
  }

  /**
   * Configures the app for ios deployment
   * @private
   */
  private configureIOS(): void {
    console.log("Using iOS configuration")
    let authConfig: AuthConfig = {
      issuer: "https://tech.soappro.mg/auth/realms/soatech",
      redirectUri: "myschema://login", // needs to be a working universal link / url schema (setup in xcode)
      clientId: 'soatech-mobile-application-id',
      responseType: 'code',
      scope: 'openid profile email offline_access',
      // Revocation Endpoint must be set manually when using Keycloak
      // See: https://github.com/manfredsteyer/angular-oauth2-oidc/issues/794
      revocationEndpoint: "https://tech.soappro.mg/auth/realms/soatech/protocol/openid-connect/revoke",
      showDebugInformation: true,
      requireHttps: false
    }
    this.oauthService.configure(authConfig);
    this.oauthService.setupAutomaticSilentRefresh();

    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      let url = new URL(event.url);
      if(url.host != "login"){
        // Only interested in redirects to myschema://login
        return;
      }

      this.zone.run(() => {

        // Building a query param object for Angular Router
        const queryParams: Params = {};
        for (const [key, value] of url.searchParams.entries()) {
          queryParams[key] = value;
        }

        // Add query params to current route
        this.router.navigate(
          [],
          {
            relativeTo: this.activatedRoute,
            queryParams: queryParams,
            queryParamsHandling: 'merge', // remove to replace all query params by provided
          })
          .then(navigateResult => {
            // After updating the route, trigger login in oauthlib and
            this.oauthService.tryLogin().then(tryLoginResult => {
              console.log("tryLogin", tryLoginResult);
              if (this.hasValidAccessToken){
                this.loadUserProfile();
                this.realmRoles = this.getRealmRoles();
              }
            })
          })
          .catch(error => console.error(error));

      });
    });
  }

  public async verifySignature(data: string, publicKeyPem: string, signatureBase64: string): Promise<boolean> {
  function pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
    const binary = atob(b64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    return buffer.buffer;
  }

  const keyBuffer = pemToArrayBuffer(publicKeyPem);
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['verify']
  );

  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));

  return await window.crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    publicKey,
    signatureBuffer,
    dataBuffer
  );
}

/**
 * Generate a key pair and sign/verify in browser (for testing)
 */
  public async testSignature(): Promise<void> {
    const data = "producteur=Koto RANDRIA;date_expiration=11-09-2025;";
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256"
      },
      true,
      ["sign", "verify"]
    );

    // Sign
    const signature = await window.crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      keyPair.privateKey,
      dataBuffer
    );
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    // Export public key to PEM
    const spki = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
    const matchResult = b64.match(/.{1,64}/g);
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${matchResult ? matchResult.join('\n') : ''}\n-----END PUBLIC KEY-----`;
    console.log("Public Key PEM:\n", publicKeyPem);
    console.log("Signature Base64:\n", signatureBase64);

    // Verify
    const isValid = await window.crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      keyPair.publicKey,
      Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0)),
      dataBuffer
    );
    // console.log("Is signature valid?", isValid); // Should be true
  }


}
